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
import { TagType } from "@/features/tag/tag-kind";
import { destroyTags } from "../server";
import { createMediaRepository } from "@/features/media/server/media-repository";
import { destroyMedia } from "@/features/media/server";

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
    await db
      .insert(schema.user)
      .values({ id: "author", name: "Author", email: "author@example.test" });
    await db
      .insert(schema.category)
      .values({ id: "category", path: "category" });
    await db
      .insert(schema.media)
      .values(
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
const advanced = { affected: 8, "also-affected": 8, unaffected: 7 };

describe("post versions on related deletion", () => {
  it("increments once per affected post across multiple deleted tags and roles, not on retries", () =>
    withDatabase(async (db) => {
      const cache = invalidator();
      await expect(
        destroyTags(db, ["a", "b", "a", "missing"], cache),
      ).resolves.toEqual({ success: true, publicSync: "completed" });
      expect(await versions(db)).toEqual(advanced);
      expect(await db.select().from(schema.postTag)).toEqual([
        { postId: "unaffected", tagId: "keep", type: TagType.ACTOR },
      ]);
      await destroyTags(db, ["a", "b"], cache);
      await destroyTags(db, [], cache);
      expect(await versions(db)).toEqual(advanced);
      expect(cache.invalidate).toHaveBeenCalledTimes(3);
    }));
  it("rolls back tag deletion and revision together and never invalidates", () =>
    withDatabase(async (db, client) => {
      await client.execute(
        "CREATE TRIGGER reject_tag_delete BEFORE DELETE ON tag BEGIN SELECT RAISE(ABORT, 'test deletion rejected'); END",
      );
      const cache = invalidator();
      await expect(destroyTags(db, ["a", "b"], cache)).rejects.toThrow();
      expect(await versions(db)).toEqual(original);
      expect(await db.select().from(schema.postTag)).toHaveLength(5);
      expect(await db.select().from(schema.tag)).toHaveLength(3);
      expect(cache.invalidate).not.toHaveBeenCalled();
    }));
  it("advances covers atomically only after object storage succeeds", () =>
    withDatabase(async (db) => {
      const repository = createMediaRepository(db);
      const cache = invalidator();
      const storage = {
        deleteObjects: vi
          .fn()
          .mockRejectedValueOnce(new Error("storage failed"))
          .mockResolvedValue(undefined),
      };
      await expect(
        destroyMedia(repository, storage, ["cover"], cache),
      ).rejects.toThrow("storage failed");
      expect(await versions(db)).toEqual(original);
      expect(cache.invalidate).not.toHaveBeenCalled();
      await expect(
        destroyMedia(repository, storage, ["cover"], cache),
      ).resolves.toEqual({ success: true });
      expect(await versions(db)).toEqual(advanced);
      expect(
        (await db.select().from(schema.post))
          .filter((post) => post.id !== "unaffected")
          .every((post) => post.coverId === null),
      ).toBe(true);
      expect(
        (await db.select().from(schema.media)).map(({ id }) => id),
      ).toEqual(["other-cover"]);
      await destroyMedia(repository, storage, ["cover"], cache);
      expect(await versions(db)).toEqual(advanced);
      expect(storage.deleteObjects).toHaveBeenCalledTimes(2);
    }));
  it("rolls back cover and revision on database failure while preserving indeterminate result", () =>
    withDatabase(async (db, client) => {
      await client.execute(
        "CREATE TRIGGER reject_media_delete BEFORE DELETE ON media BEGIN SELECT RAISE(ABORT, 'test deletion rejected'); END",
      );
      const cache = invalidator();
      await expect(
        destroyMedia(
          createMediaRepository(db),
          { deleteObjects: vi.fn().mockResolvedValue(undefined) },
          ["cover"],
          cache,
        ),
      ).resolves.toMatchObject({ success: false, state: "indeterminate" });
      expect(await versions(db)).toEqual(original);
      expect(
        (await db.select().from(schema.post)).find(
          ({ id }) => id === "affected",
        )?.coverId,
      ).toBe("cover");
      expect(await db.select().from(schema.media)).toHaveLength(2);
      expect(cache.invalidate).not.toHaveBeenCalled();
    }));
  it("does not increment again when commit succeeds but acknowledgement is lost", () =>
    withDatabase(async (db) => {
      const repository = createMediaRepository(db);
      const cache = invalidator();
      const storage = { deleteObjects: vi.fn().mockResolvedValue(undefined) };
      await expect(
        destroyMedia(
          {
            ...repository,
            deleteRecords: async (ids) => {
              await repository.deleteRecords(ids);
              throw new Error("response lost");
            },
          },
          storage,
          ["cover"],
          cache,
        ),
      ).resolves.toMatchObject({ success: false, state: "indeterminate" });
      expect(await versions(db)).toEqual(advanced);
      expect(cache.invalidate).not.toHaveBeenCalled();
      await expect(
        destroyMedia(repository, storage, ["cover"], cache),
      ).resolves.toEqual({ success: true });
      expect(await versions(db)).toEqual(advanced);
      expect(storage.deleteObjects).toHaveBeenCalledTimes(1);
      expect(cache.invalidate).toHaveBeenCalledTimes(1);
    }));
});
