// @vitest-environment node
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { TagType } from "@/features/tag/types/tag.type";
import { createMediaRepository } from "@/features/media/server/media-repository";
import { destroyMedia } from "@/features/media/server/media-delete";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_ASSET_URL: "https://assets.example.test" },
}));

async function withDatabase(
  run: (
    db: ReturnType<typeof drizzle<typeof schema>>,
    client: ReturnType<typeof createClient>,
  ) => Promise<void>,
) {
  const directory = mkdtempSync(join(tmpdir(), "honeycomb-related-version-"));
  let client: ReturnType<typeof createClient> | undefined;
  try {
    const stat = lstatSync(directory);
    expect(stat.isSymbolicLink()).toBe(false);
    if (process.getuid) expect(stat.uid).toBe(process.getuid());
    client = createClient({
      url: `file:${join(directory, "test.db")}`,
      authToken: "local-test-sentinel",
    });
    const db = drizzle(client, { schema });
    for (const file of readdirSync("drizzle")
      .filter((file) => file.endsWith(".sql"))
      .sort()) {
      await client.executeMultiple(readFileSync(`drizzle/${file}`, "utf8"));
    }
    await db.insert(schema.user).values({
      id: "author",
      name: "Author",
      email: "author@example.test",
      level: UserLevel.ADMIN,
      status: UserStatus.ENABLE,
    });
    await db
      .insert(schema.category)
      .values({ id: "category", path: "category" });
    await db.insert(schema.media).values(
      ["cover", "other-cover"].map((id) => ({
        id,
        key: `${id}.jpg`,
        name: id,
        size: 1,
        type: "image/jpeg",
        url: `https://assets.example.test/${id}.jpg`,
      })),
    );
    await db.insert(schema.post).values(
      [
        { id: "affected", coverId: "cover" },
        { id: "also-affected", coverId: "cover" },
        { id: "unaffected", coverId: "other-cover" },
      ].map((post) => ({
        ...post,
        authorId: "author",
        categoryId: "category",
        version: 7,
        updatedAt: "2020-01-01T00:00:00.000Z",
      })),
    );
    await db
      .insert(schema.tag)
      .values(["a", "b", "keep"].map((id) => ({ id })));
    await db.insert(schema.postTag).values([
      { postId: "affected", tagId: "a", type: TagType.ACTOR },
      { postId: "affected", tagId: "a", type: TagType.DIRECTOR },
      { postId: "affected", tagId: "b", type: TagType.ACTOR },
      { postId: "also-affected", tagId: "b", type: TagType.ACTOR },
      { postId: "unaffected", tagId: "keep", type: TagType.ACTOR },
    ]);
    await run(db, client);
  } finally {
    client?.close();
    rmSync(directory, { recursive: true, force: true });
    expect(existsSync(directory)).toBe(false);
  }
}
const invalidator = () => ({
  invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
});
async function versions(db: Database) {
  const rows = await db.select().from(schema.post);
  expect(
    rows.every((row) => row.updatedAt === "2020-01-01T00:00:00.000Z"),
  ).toBe(true);
  return Object.fromEntries(rows.map(({ id, version }) => [id, version]));
}
const original = { affected: 7, "also-affected": 7, unaffected: 7 };

describe("media deletion outcomes and related post versions", () => {
  it("rejects known cover references before storage and preserves all post versions", () =>
    withDatabase(async (db) => {
      const cache = invalidator();
      const storage = { deleteObjects: vi.fn(), headObject: vi.fn() };
      await expect(
        destroyMedia(
          createMediaRepository(db),
          storage,
          ["cover"],
          cache,
          "author",
          true,
        ),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      expect(await versions(db)).toEqual(original);
      const posts = await db.select().from(schema.post);
      expect(
        posts
          .filter((post) => post.id !== "unaffected")
          .every((post) => post.coverId === "cover"),
      ).toBe(true);
      expect(await db.select().from(schema.media)).toHaveLength(2);
      expect(storage.deleteObjects).not.toHaveBeenCalled();
      expect(storage.headObject).not.toHaveBeenCalled();
      expect(cache.invalidate).not.toHaveBeenCalled();
    }));
  it("preserves ordinary row and unrelated covers after storage success and database rollback", () =>
    withDatabase(async (db, client) => {
      await db.insert(schema.media).values({
        id: "unused",
        key: "unused.jpg",
        name: "unused",
        size: 1,
        type: "image/jpeg",
        url: "https://assets.example.test/unused.jpg",
      });
      await client.execute(
        "CREATE TRIGGER reject_media_delete BEFORE DELETE ON media BEGIN SELECT RAISE(ABORT, 'test deletion rejected'); END",
      );
      const cache = invalidator();
      const storage = {
        deleteObjects: vi.fn().mockResolvedValue(undefined),
        headObject: vi.fn().mockResolvedValue(null),
      };
      await expect(
        destroyMedia(
          createMediaRepository(db),
          storage,
          ["unused"],
          cache,
          "author",
          true,
        ),
      ).rejects.toThrow("删除结果无法确认");
      expect(await versions(db)).toEqual(original);
      expect(
        (await db.select().from(schema.post)).find(
          (row) => row.id === "affected",
        )?.coverId,
      ).toBe("cover");
      expect(
        (await db.select().from(schema.media)).find(
          (row) => row.id === "unused",
        ),
      ).toMatchObject({
        key: "unused.jpg",
      });
      expect(storage.deleteObjects).toHaveBeenCalledExactlyOnceWith([
        "unused.jpg",
      ]);
      expect(cache.invalidate).not.toHaveBeenCalled();
    }));
  it("does not repeat storage deletion when row deletion commits but acknowledgement is lost", () =>
    withDatabase(async (db) => {
      await db.insert(schema.media).values({
        id: "unused",
        key: "unused.jpg",
        name: "unused",
        size: 1,
        type: "image/jpeg",
        url: "https://assets.example.test/unused.jpg",
      });
      const repository = createMediaRepository(db);
      const cache = invalidator();
      const storage = {
        deleteObjects: vi.fn().mockResolvedValue(undefined),
        headObject: vi.fn().mockResolvedValue(null),
      };
      await expect(
        destroyMedia(
          {
            ...repository,
            deleteWithStorage: async (
              ...args: Parameters<typeof repository.deleteWithStorage>
            ) => {
              await repository.deleteWithStorage(...args);
              throw new Error("response lost");
            },
          },
          storage,
          ["unused"],
          cache,
          "author",
          true,
        ),
      ).rejects.toThrow("删除结果无法确认");
      expect(await versions(db)).toEqual(original);
      expect(cache.invalidate).not.toHaveBeenCalled();
      expect(
        (await db.select().from(schema.media)).find(
          (row) => row.id === "unused",
        ),
      ).toBeUndefined();
      await expect(
        destroyMedia(repository, storage, ["unused"], cache, "author", true),
      ).resolves.toEqual({ success: true, publicSync: "completed" });
      expect(await versions(db)).toEqual(original);
      expect(storage.deleteObjects).toHaveBeenCalledTimes(1);
      expect(cache.invalidate).toHaveBeenCalledTimes(1);
    }));
});
