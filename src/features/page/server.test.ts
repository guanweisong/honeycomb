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
import { UserLevel, UserStatus } from "@/features/user/user";
import { PageStatus } from "./page-status";
import { PageTemplate } from "./page-template";
import * as commands from "./server";
import { getPage, listPages } from "./server/page-queries";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_ASSET_URL: "https://assets.test" },
}));
vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (_name: string, _kind: string, run: () => unknown) =>
    run(),
}));
const input = {
  title: { zh: "标题", en: "Title" },
  content: { zh: "正文", en: "Content" },
  template: PageTemplate.DEFAULT,
  status: PageStatus.DRAFT,
  creationToken: "11111111-1111-4111-8111-111111111111",
};
const cache = (state: "completed" | "degraded" = "completed") => ({
  invalidate: vi.fn().mockResolvedValue({ state }),
});
describe("atomic versioned page writes", () => {
  let directory: string | undefined, client: Client | undefined, db: Database;
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
    directory = mkdtempSync(join(tmpdir(), "honeycomb-page-atomic-"));
    expect(lstatSync(directory).isSymbolicLink()).toBe(false);
    expect(lstatSync(directory).uid).toBe(process.getuid?.());
    client = createClient({ url: `file:${join(directory, "page.db")}` });
    db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "drizzle" });
    await client.execute("pragma foreign_keys=on");
    await db.insert(schema.user).values({
      id: "author",
      level: UserLevel.ADMIN,
      status: UserStatus.ENABLE,
    });
  });
  const create = () => commands.createPage(db, input, "author", cache());
  it.each(["completed", "degraded"] as const)(
    "returns minimal committed result with %s invalidation",
    async (state) => {
      const invalidator = cache(state);
      const result = await commands.createPage(
        db,
        input,
        "author",
        invalidator,
      );
      expect(result).toEqual({
        id: expect.any(String),
        version: 0,
        publicSync: state,
      });
      expect(await db.select().from(schema.pageTranslation)).toHaveLength(2);
      expect(invalidator.invalidate).toHaveBeenCalledExactlyOnceWith({
        contents: [{ id: result.id, type: "page" }],
        refreshLayout: true,
        refreshSitemap: true,
      });
      expect(
        await commands.updatePage(
          db,
          { id: result.id, expectedVersion: 0, title: { zh: "新", en: "New" } },
          "author",
          invalidator,
        ),
      ).toEqual({ id: result.id, version: 1, publicSync: state });
    },
  );
  it("rolls back body and version when bilingual translation fails", async () => {
    const created = await create();
    const invalidator = cache();
    await client?.execute(
      "CREATE TRIGGER fail_page_translation BEFORE UPDATE ON page_translation WHEN NEW.locale='zh' BEGIN SELECT RAISE(ABORT,'translation failed'); END",
    );
    await expect(
      commands.updatePage(
        db,
        { id: created.id, expectedVersion: 0, title: { zh: "新", en: "New" } },
        "author",
        invalidator,
      ),
    ).rejects.toMatchObject({
      cause: expect.objectContaining({
        message: expect.stringContaining("translation failed"),
      }),
    });
    expect(await getPage(db, created.id, "ALL")).toMatchObject({
      version: 0,
      title: input.title,
    });
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
  it("rolls back parent when creating translations fails", async () => {
    await client?.execute(
      "CREATE TRIGGER fail_page_translation BEFORE INSERT ON page_translation BEGIN SELECT RAISE(ABORT,'translation failed'); END",
    );
    const invalidator = cache();
    await expect(
      commands.createPage(db, input, "author", invalidator),
    ).rejects.toThrow();
    expect(await db.select().from(schema.page)).toEqual([]);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
  it("allows one of two same-version writers only", async () => {
    const created = await create();
    const invalidator = cache();
    const results = await Promise.allSettled(
      ["A", "B"].map((title) =>
        commands.updatePage(
          db,
          {
            id: created.id,
            expectedVersion: 0,
            title: { en: title, zh: title },
          },
          "author",
          invalidator,
        ),
      ),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "CONFLICT" },
    });
    expect(await getPage(db, created.id, "ALL")).toMatchObject({ version: 1 });
    expect(invalidator.invalidate).toHaveBeenCalledOnce();
  });
  it("deduplicates concurrent creation and retains original hash after edits", async () => {
    const [a, b] = await Promise.all([create(), create()]);
    expect(a.id).toBe(b.id);
    await commands.updatePage(
      db,
      { id: a.id, expectedVersion: 0, title: { zh: "新", en: "Later" } },
      "author",
      cache(),
    );
    expect(await create()).toEqual({
      id: a.id,
      version: 1,
      publicSync: "completed",
    });
    expect(
      await commands.getPageCreationResult(db, input.creationToken, "author"),
    ).toEqual({ id: a.id, version: 1 });
    await expect(
      commands.createPage(
        db,
        { ...input, title: { zh: "异", en: "Other" } },
        "author",
        cache(),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.select().from(schema.page)).toHaveLength(1);
  });
  it("scopes tokens and recovery to current actor and has no deleted receipt", async () => {
    const a = await create();
    await db.insert(schema.user).values({
      id: "other",
      level: UserLevel.ADMIN,
      status: UserStatus.ENABLE,
    });
    expect(
      await commands.getPageCreationResult(db, input.creationToken, "other"),
    ).toBeNull();
    const b = await commands.createPage(db, input, "other", cache());
    expect(a.id).not.toBe(b.id);
    await commands.destroyPages(
      db,
      { items: [{ id: a.id, expectedVersion: 0 }] },
      "author",
      cache(),
    );
    expect(
      await commands.getPageCreationResult(db, input.creationToken, "author"),
    ).toBeNull();
  });
  it.each([UserStatus.DISABLE, UserStatus.DELETED])(
    "rechecks %s actor before all commands and recovery",
    async (status) => {
      const a = await create();
      await db
        .update(schema.user)
        .set({ status })
        .where(eq(schema.user.id, "author"));
      for (const op of [
        () => create(),
        () =>
          commands.updatePage(
            db,
            { id: a.id, expectedVersion: 0, title: input.title },
            "author",
            cache(),
          ),
        () =>
          commands.destroyPages(
            db,
            { items: [{ id: a.id, expectedVersion: 0 }] },
            "author",
            cache(),
          ),
        () => commands.getPageCreationResult(db, input.creationToken, "author"),
      ])
        await expect(op()).rejects.toMatchObject({ code: "FORBIDDEN" });
    },
  );
  it("rejects a guest or missing actor even on direct command entry", async () => {
    await db
      .update(schema.user)
      .set({ level: UserLevel.GUEST })
      .where(eq(schema.user.id, "author"));
    await expect(create()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      commands.createPage(db, input, "absent", cache()),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("rejects unsupported direct fields without touching storage", async () => {
    const invalidator = cache();
    const invalidInput = { ...input, authorId: "forged" };
    await expect(
      commands.createPage(db, invalidInput, "author", invalidator),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(await db.select().from(schema.page)).toEqual([]);
  });
  it("rolls back an entire delete batch on a stale item", async () => {
    const a = await create();
    const b = await commands.createPage(
      db,
      { ...input, creationToken: "22222222-2222-4222-8222-222222222222" },
      "author",
      cache(),
    );
    await commands.updatePage(
      db,
      { id: b.id, expectedVersion: 0, title: input.title },
      "author",
      cache(),
    );
    const invalidator = cache();
    await expect(
      commands.destroyPages(
        db,
        {
          items: [
            { id: a.id, expectedVersion: 0 },
            { id: b.id, expectedVersion: 0 },
          ],
        },
        "author",
        invalidator,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await db.select().from(schema.page)).toHaveLength(2);
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
  it.each([
    [PageStatus.DRAFT, PageStatus.PUBLISHED],
    [PageStatus.TO_AUDIT, PageStatus.PUBLISHED],
    [PageStatus.PUBLISHED, PageStatus.DRAFT],
  ] as const)("preserves %s to %s transition", async (status, target) => {
    const a = await commands.createPage(
      db,
      { ...input, status },
      "author",
      cache(),
    );
    await commands.updatePage(
      db,
      { id: a.id, expectedVersion: 0, status: target },
      "author",
      cache(),
    );
    expect(await getPage(db, a.id, "ALL")).toMatchObject({
      status: target,
      version: 1,
    });
  });
  it("rejects invalid status transitions and missing targets", async () => {
    const a = await create();
    await expect(
      commands.updatePage(
        db,
        { id: a.id, expectedVersion: 0, status: PageStatus.TO_AUDIT },
        "author",
        cache(),
      ),
    ).rejects.toMatchObject({ code: "INVALID_PAGE_STATUS" });
    await expect(
      commands.updatePage(
        db,
        {
          id: "507f1f77bcf86cd799439099",
          expectedVersion: 0,
          title: input.title,
        },
        "author",
        cache(),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(
      commands.destroyPages(
        db,
        { items: [{ id: "507f1f77bcf86cd799439099", expectedVersion: 0 }] },
        "author",
        cache(),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("preserves omitted fields and rejects empty required bilingual values", async () => {
    const a = await create();
    await commands.updatePage(
      db,
      { id: a.id, expectedVersion: 0, title: { en: "New", zh: "新" } },
      "author",
      cache(),
    );
    expect(await getPage(db, a.id, "ALL")).toMatchObject({
      title: { en: "New", zh: "新" },
      content: input.content,
      version: 1,
    });
    await expect(
      commands.updatePage(
        db,
        { id: a.id, expectedVersion: 1, title: { en: "", zh: "" } },
        "author",
        cache(),
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("rejects non-ready managed media in the same page save transaction", async () => {
    const a = await create();
    await db.insert(schema.media).values({
      id: "media",
      key: "unready.png",
      name: "unready",
      size: 1,
      type: "image/png",
      url: "https://assets.test/unready.png",
      state: "DELETING",
    });
    const invalidator = cache();
    await expect(
      commands.updatePage(
        db,
        {
          id: a.id,
          expectedVersion: 0,
          content: {
            en: '<img src="https://assets.test/unready.png">',
            zh: "正文",
          },
        },
        "author",
        invalidator,
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await getPage(db, a.id, "ALL")).toMatchObject({
      version: 0,
      content: input.content,
    });
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
  it("updates both bilingual fields atomically and accepts unchanged status", async () => {
    const a = await create();
    await commands.updatePage(
      db,
      {
        id: a.id,
        expectedVersion: 0,
        status: PageStatus.DRAFT,
        title: { en: "New", zh: "新" },
        content: { en: "Body", zh: "文" },
      },
      "author",
      cache(),
    );
    expect(await getPage(db, a.id, "ALL")).toMatchObject({
      version: 1,
      title: { en: "New", zh: "新" },
      content: { en: "Body", zh: "文" },
    });
  });
  it("refuses withdrawing an unpublished page and does not increment draft views", async () => {
    const a = await commands.createPage(
      db,
      { ...input, status: PageStatus.TO_AUDIT },
      "author",
      cache(),
    );
    await expect(
      commands.updatePage(
        db,
        { id: a.id, expectedVersion: 0, status: PageStatus.DRAFT },
        "author",
        cache(),
      ),
    ).rejects.toMatchObject({ code: "INVALID_STATE_TRANSITION" });
    expect(await commands.incrementPageViews(db, a.id)).toBeUndefined();
  });
  it("validates versioned delete input before writes", async () => {
    await expect(
      commands.destroyPages(db, { items: [] }, "author", cache()),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
  it("does not leak private creation fields and views do not advance editor version", async () => {
    const a = await commands.createPage(
      db,
      { ...input, status: PageStatus.PUBLISHED },
      "author",
      cache(),
    );
    await commands.incrementPageViews(db, a.id);
    for (const projection of [
      await getPage(db, a.id, "ALL"),
      await getPage(db, a.id, "PUBLISHED_ONLY"),
      ...(await listPages(db, {}, "ALL")).list,
      ...(await listPages(db, {}, "PUBLISHED_ONLY")).list,
    ]) {
      expect(projection).toMatchObject({ id: a.id, version: 0, views: 1 });
      expect(projection).not.toHaveProperty("creationToken");
      expect(projection).not.toHaveProperty("creationInputHash");
    }
  });
});
describe("page transaction retries", () => {
  it("bounds retries to contention before the business callback starts", async () => {
    const fake = createMockDb();
    fake.transaction.mockRejectedValue(
      Object.assign(new Error("busy"), { code: "SQLITE_BUSY" }),
    );
    await expect(
      commands.createPage(asMockDatabase(fake), input, "author", cache()),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(fake.transaction).toHaveBeenCalledTimes(4);
    expect(fake.insert).not.toHaveBeenCalled();
  });
  it("does not retry a callback or unknown commit failure", async () => {
    const fake = createMockDb();
    fake.limit.mockResolvedValue([
      { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
    ]);
    fake.transaction.mockImplementation(async (callback) => {
      await callback(fake);
      throw Object.assign(new Error("unknown commit"), { code: "SQLITE_BUSY" });
    });
    fake.returning.mockResolvedValue([{ id: "page", version: 0 }]);
    const invalidator = cache();
    await expect(
      commands.createPage(asMockDatabase(fake), input, "author", invalidator),
    ).rejects.toThrow("unknown commit");
    expect(fake.transaction).toHaveBeenCalledOnce();
    expect(invalidator.invalidate).not.toHaveBeenCalled();
  });
});
