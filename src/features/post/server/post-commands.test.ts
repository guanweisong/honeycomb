// @vitest-environment node
import { createClient, type Client } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdtempSync, rmSync, existsSync, lstatSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import * as permissions from "@/lib/auth/permissions";
import { UserLevel, UserStatus } from "@/features/user/user";
import { PostStatus } from "../post-status";
import { TagType } from "@/features/tag/tag-kind";
import {
  createPost,
  updatePost,
  destroyPosts,
  getPostCreationResult,
  incrementPostViews,
} from "./post-commands";
import { getPost } from "./post-queries";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (_name: string, _kind: string, run: () => unknown) =>
    run(),
}));
const actorId = "author";
const input = {
  categoryId: "category",
  creationToken: "1d40d08b-55cc-4c2c-9dc0-6b151b9866f4",
};
const cache = (state: "completed" | "degraded" = "completed") => ({
  invalidate: vi.fn().mockResolvedValue({ state }),
});
const targets = (ids: string[]) => ({
  contents: ids.map((id) => ({ id, type: "post" })),
  refreshLayout: true,
  refreshPostIndex: true,
  refreshSitemap: true,
});

describe("atomic post writes", () => {
  let directory: string | undefined;
  let client: Client | undefined;
  let db: Database;
  afterEach(() => {
    client?.close();
    if (directory) {
      rmSync(directory, { recursive: true, force: true });
      expect(existsSync(directory)).toBe(false);
    }
    client = undefined;
    directory = undefined;
  });
  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "honeycomb-post-atomic-"));
    const stat = lstatSync(directory);
    expect(stat.isSymbolicLink()).toBe(false);
    expect(stat.uid).toBe(process.getuid?.());
    client = createClient({ url: `file:${join(directory, "post.db")}` });
    db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "drizzle" });
    await client.execute("pragma foreign_keys = on");
    await db.insert(schema.user).values({
      id: actorId,
      level: UserLevel.ADMIN,
      status: UserStatus.ENABLE,
    });
    await db
      .insert(schema.category)
      .values({ id: "category", path: "category" });
    await db.insert(schema.tag).values([{ id: "tag-1" }, { id: "tag-2" }]);
  });
  async function row(id: string) {
    const [result] = await db
      .select()
      .from(schema.post)
      .where(eq(schema.post.id, id));
    if (!result) throw new Error("Expected fixture post to exist");
    return result;
  }
  async function create() {
    return createPost(
      db,
      {
        ...input,
        status: PostStatus.DRAFT,
        title: { en: "original", zh: "原文" },
        movieActorIds: ["tag-1"],
      },
      actorId,
      cache(),
    );
  }

  it.each(["completed", "degraded"] as const)(
    "commits all fields before %s public synchronization",
    async (state) => {
      const invalidator = cache(state);
      const result = await createPost(
        db,
        {
          ...input,
          title: { en: "created" },
          movieActorIds: ["tag-1", "tag-1"],
          movieDirectorIds: ["tag-2"],
        },
        actorId,
        invalidator,
      );
      expect(result).toEqual({
        id: expect.any(String),
        version: 0,
        publicSync: state,
      });
      expect(await db.select().from(schema.postTranslation)).toHaveLength(1);
      expect(await db.select().from(schema.postTag)).toHaveLength(2);
      expect(invalidator.invalidate).toHaveBeenCalledExactlyOnceWith(
        targets([result.id]),
      );
    },
  );
  it("rolls back parent, translations and relations when creating a bad relation", async () => {
    const invalidator = cache();
    await expect(
      createPost(
        db,
        { ...input, title: { en: "new" }, movieActorIds: ["missing"] },
        actorId,
        invalidator,
      ),
    ).rejects.toThrow();
    expect(await db.select().from(schema.post)).toEqual([]);
    expect(await db.select().from(schema.postTranslation)).toEqual([]);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
  it("rolls back a new version and translations when any update relation fails", async () => {
    const created = await create();
    const invalidator = cache();
    await expect(
      updatePost(
        db,
        {
          id: created.id,
          expectedVersion: 0,
          title: { en: "changed" },
          movieActorIds: [],
          movieDirectorIds: ["missing"],
        },
        actorId,
        invalidator,
      ),
    ).rejects.toThrow();
    expect((await row(created.id)).version).toBe(0);
    expect(await getPost(db, created.id, "ALL")).toMatchObject({
      title: { en: "original" },
      movieActors: [{ id: "tag-1" }],
    });
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
  it("patches locales and only supplied relation roles, with explicit null and clear semantics", async () => {
    const created = await create();
    await updatePost(
      db,
      {
        id: created.id,
        expectedVersion: 0,
        title: { en: "changed" },
        movieDirectorIds: ["tag-2"],
      },
      actorId,
      cache(),
    );
    expect(await getPost(db, created.id, "ALL")).toMatchObject({
      version: 1,
      title: { en: "changed", zh: "原文" },
      movieActors: [{ id: "tag-1" }],
      movieDirectors: [{ id: "tag-2" }],
    });
    await updatePost(
      db,
      { id: created.id, expectedVersion: 1, title: null, movieActorIds: [] },
      actorId,
      cache(),
    );
    expect(await getPost(db, created.id, "ALL")).toMatchObject({
      version: 2,
      title: null,
      movieActors: [],
      movieDirectors: [{ id: "tag-2" }],
    });
  });
  it("allows only one concurrent writer at the same expected version", async () => {
    const created = await create();
    const invalidator = cache();
    const outcomes = await Promise.allSettled([
      updatePost(
        db,
        { id: created.id, expectedVersion: 0, movieTime: "first" },
        actorId,
        invalidator,
      ),
      updatePost(
        db,
        { id: created.id, expectedVersion: 0, movieTime: "second" },
        actorId,
        invalidator,
      ),
    ]);
    expect(
      outcomes.filter(({ status }) => status === "fulfilled"),
    ).toHaveLength(1);
    expect(outcomes.filter(({ status }) => status === "rejected")).toHaveLength(
      1,
    );
    expect(
      outcomes.find((outcome) => outcome.status === "rejected"),
    ).toMatchObject({ reason: { code: "CONFLICT" } });
    expect((await row(created.id)).version).toBe(1);
    expect(invalidator.invalidate).toHaveBeenCalledOnce();
  });
  it("returns CONFLICT for a stale editor without invalidating", async () => {
    const created = await create();
    await updatePost(
      db,
      { id: created.id, expectedVersion: 0, movieTime: "new" },
      actorId,
      cache(),
    );
    const invalidator = cache();
    await expect(
      updatePost(
        db,
        { id: created.id, expectedVersion: 0, movieActorIds: [] },
        actorId,
        invalidator,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
  it("replays the same creation intent after later edits without overwriting them", async () => {
    const created = await createPost(db, input, actorId, cache());
    await updatePost(
      db,
      { id: created.id, expectedVersion: 0, movieTime: "later" },
      actorId,
      cache(),
    );
    expect(
      await createPost(
        db,
        { creationToken: input.creationToken, categoryId: input.categoryId },
        actorId,
        cache(),
      ),
    ).toEqual({ id: created.id, version: 1, publicSync: "completed" });
    expect((await row(created.id)).movieTime).toBe("later");
    expect(
      await getPostCreationResult(db, input.creationToken, actorId),
    ).toEqual({ id: created.id, version: 1 });
  });
  it("rejects a reused token with different original intent", async () => {
    await createPost(db, input, actorId, cache());
    await expect(
      createPost(
        db,
        { ...input, title: { en: "different" } },
        actorId,
        cache(),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("scopes creation tokens and result lookup to the authenticated actor", async () => {
    const first = await createPost(db, input, actorId, cache());
    await db
      .insert(schema.user)
      .values({ id: "another", level: UserLevel.ADMIN });
    expect(
      await getPostCreationResult(db, input.creationToken, "another"),
    ).toBeNull();
    const second = await createPost(db, input, "another", cache());
    expect(second.id).not.toBe(first.id);
  });
  it("deduplicates concurrent creation for the same actor and token", async () => {
    const results = await Promise.all([
      createPost(db, input, actorId, cache()),
      createPost(db, input, actorId, cache()),
    ]);
    expect(results[0].id).toBe(results[1].id);
    expect(await db.select().from(schema.post)).toHaveLength(1);
  });
  it.each([UserStatus.DISABLE, UserStatus.DELETED])(
    "rechecks %s actor on replay, update, delete and creation lookup",
    async (status) => {
      const created = await createPost(db, input, actorId, cache());
      await db
        .update(schema.user)
        .set({ status })
        .where(eq(schema.user.id, actorId));
      await expect(
        createPost(db, input, actorId, cache()),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        updatePost(
          db,
          { id: created.id, expectedVersion: 0, movieActorIds: [] },
          actorId,
          cache(),
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        destroyPosts(
          db,
          { items: [{ id: created.id, expectedVersion: 0 }] },
          actorId,
          cache(),
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        getPostCreationResult(db, input.creationToken, actorId),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );
  it("rejects revoked role even when router previously admitted the account", async () => {
    const created = await create();
    await db
      .update(schema.user)
      .set({ level: UserLevel.GUEST })
      .where(eq(schema.user.id, actorId));
    await expect(
      updatePost(
        db,
        { id: created.id, expectedVersion: 0, movieActorIds: [] },
        actorId,
        cache(),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("requires tag management for any relation patch including clears and replays", async () => {
    const created = await create();
    const originalCan = permissions.can;
    const permission = vi
      .spyOn(permissions, "can")
      .mockImplementation(
        (role, capability) =>
          capability !== permissions.Permission.postManageTags &&
          originalCan(role, capability),
      );
    try {
      await updatePost(
        db,
        { id: created.id, expectedVersion: 0, movieTime: "allowed" },
        actorId,
        cache(),
      );
      await expect(
        updatePost(
          db,
          { id: created.id, expectedVersion: 1, movieActorIds: [] },
          actorId,
          cache(),
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        createPost(
          db,
          {
            ...input,
            status: PostStatus.DRAFT,
            title: { en: "original", zh: "原文" },
            movieActorIds: ["tag-1"],
          },
          actorId,
          cache(),
        ),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    } finally {
      permission.mockRestore();
    }
  });
  it("never leaks private creation metadata on mutation or detail", async () => {
    const result = await createPost(db, input, actorId, cache());
    expect(await row(result.id)).toMatchObject({
      creationToken: input.creationToken,
      creationInputHash: expect.any(String),
    });
    expect(Object.keys(result).sort()).toEqual(["id", "publicSync", "version"]);
    for (const visibility of ["ALL", "PUBLISHED_ONLY"] as const) {
      await db
        .update(schema.post)
        .set({ status: PostStatus.PUBLISHED })
        .where(eq(schema.post.id, result.id));
      const detail = await getPost(db, result.id, visibility);
      expect(detail).not.toHaveProperty("creationToken");
      expect(detail).not.toHaveProperty("creationInputHash");
    }
  });
  it("rolls back an entire batch delete on any stale version", async () => {
    const first = await create();
    const second = await createPost(
      db,
      { ...input, creationToken: "1730ef5b-f5e9-4f80-aa54-cf60f71c4397" },
      actorId,
      cache(),
    );
    const invalidator = cache();
    await expect(
      destroyPosts(
        db,
        {
          items: [
            { id: first.id, expectedVersion: 0 },
            { id: second.id, expectedVersion: 2 },
          ],
        },
        actorId,
        invalidator,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.select().from(schema.post)).toHaveLength(2);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
    await destroyPosts(
      db,
      {
        items: [
          { id: first.id, expectedVersion: 0 },
          { id: second.id, expectedVersion: 0 },
        ],
      },
      actorId,
      invalidator,
    );
    expect(await db.select().from(schema.post)).toEqual([]);
    expect(invalidator.invalidate).toHaveBeenCalledExactlyOnceWith(
      targets([first.id, second.id]),
    );
    expect(
      await getPostCreationResult(db, input.creationToken, actorId),
    ).toBeNull();
  });
  it("keeps views independent from edit version and timestamp", async () => {
    const created = await createPost(
      db,
      { ...input, status: PostStatus.PUBLISHED },
      actorId,
      cache(),
    );
    const before = await row(created.id);
    await incrementPostViews(db, created.id);
    expect(await row(created.id)).toMatchObject({
      version: 0,
      updatedAt: before.updatedAt,
      views: 1,
    });
  });
  it.each([
    [PostStatus.DRAFT, PostStatus.PUBLISHED],
    [PostStatus.TO_AUDIT, PostStatus.PUBLISHED],
    [PostStatus.PUBLISHED, PostStatus.DRAFT],
  ])("keeps valid transition %s → %s", async (current, target) => {
    const created = await createPost(
      db,
      { ...input, status: current },
      actorId,
      cache(),
    );
    const result = await updatePost(
      db,
      { id: created.id, expectedVersion: 0, status: target },
      actorId,
      cache(),
    );
    expect(result.version).toBe(1);
    expect((await row(created.id)).status).toBe(target);
  });
  it("rejects invalid transition before changing relations", async () => {
    const created = await createPost(
      db,
      { ...input, status: PostStatus.TO_AUDIT },
      actorId,
      cache(),
    );
    await expect(
      updatePost(
        db,
        {
          id: created.id,
          expectedVersion: 0,
          status: PostStatus.DRAFT,
          movieActorIds: ["tag-1"],
        },
        actorId,
        cache(),
      ),
    ).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" });
    expect((await row(created.id)).version).toBe(0);
    expect(await db.select().from(schema.postTag)).toEqual([]);
  });
  it("stores the four typed relation roles distinctly", async () => {
    await createPost(
      db,
      {
        ...input,
        movieActorIds: ["tag-1"],
        movieDirectorIds: ["tag-1"],
        movieStyleIds: ["tag-1"],
        galleryStyleIds: ["tag-1"],
      },
      actorId,
      cache(),
    );
    expect(
      (await db.select().from(schema.postTag)).map(({ type }) => type).sort(),
    ).toEqual(Object.values(TagType).sort());
  });
});

describe("post transaction retry boundary", () => {
  it("does not retry an unknown network outcome", async () => {
    const fake = createMockDb();
    const failure = Object.assign(new Error("connection lost after commit"), {
      code: "CONNECTION_CLOSED",
    });
    fake.transaction.mockRejectedValue(failure);
    await expect(
      createPost(asMockDatabase(fake), input, actorId, cache()),
    ).rejects.toBe(failure);
    expect(fake.transaction).toHaveBeenCalledOnce();
  });
  it("does not retry a failure after the transaction callback started, including failed rollback", async () => {
    const fake = createMockDb();
    const failure = Object.assign(new Error("rollback failed"), {
      code: "SQLITE_BUSY",
    });
    fake.limit.mockRejectedValue(failure);
    await expect(
      createPost(asMockDatabase(fake), input, actorId, cache()),
    ).rejects.toBe(failure);
    expect(fake.transaction).toHaveBeenCalledOnce();
  });
  it("bounds known BEGIN contention and reports a non-specific conflict", async () => {
    const fake = createMockDb();
    fake.transaction.mockRejectedValue(
      Object.assign(new Error("busy"), { code: "SQLITE_BUSY" }),
    );
    await expect(
      createPost(asMockDatabase(fake), input, actorId, cache()),
    ).rejects.toMatchObject({
      code: "CONFLICT",
      message: "保存暂时繁忙，请核对结果后重试",
    });
    expect(fake.transaction).toHaveBeenCalledTimes(4);
    expect(fake.insert).not.toHaveBeenCalled();
  });
});
