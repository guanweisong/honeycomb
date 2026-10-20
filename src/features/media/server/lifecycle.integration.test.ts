// @vitest-environment node
import snapshot from "../../../../drizzle/meta/0007_snapshot.json";
import { inspectSchema } from "../../../../scripts/audit-production-schema";
import { findSnapshotTableErrors } from "../../../../scripts/check-migrations";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import { expect, it, vi } from "vitest";
import sharp from "sharp";
import * as schema from "@/lib/db/schema";
import { MultiLangEnum } from "@/lib/i18n/i18n";
import { UserLevel } from "@/features/user/user";
import { createMediaRepository } from "./media-repository";
import {
  beginMediaUpload,
  confirmMediaUpload,
  destroyMedia,
  type MediaStorage,
} from "../server";
import { assertMediaReferencesReady } from "./media-references";
vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_ASSET_URL: "https://assets.example.test" },
}));
async function withDatabase(
  run: (
    db: ReturnType<typeof drizzle<typeof schema>>,
    client: ReturnType<typeof createClient>,
  ) => Promise<void>,
  beforeMedia?: (client: ReturnType<typeof createClient>) => Promise<void>,
  expectMigrationFailure = false,
) {
  const directory = mkdtempSync(join(tmpdir(), "honeycomb-media-test-"));
  let client: ReturnType<typeof createClient> | undefined;
  try {
    expect(lstatSync(directory).isSymbolicLink()).toBe(false);
    if (process.getuid) expect(lstatSync(directory).uid).toBe(process.getuid());
    client = createClient({
      url: `file:${join(directory, "test.db")}`,
      authToken: "local-test-sentinel",
    });
    const db = drizzle(client, { schema });
    if (beforeMedia) {
      const history = join(directory, "migrations");
      mkdirSync(join(history, "meta"), { recursive: true });
      for (const file of readdirSync("drizzle").filter(
        (name) => name.endsWith(".sql") && name < "0007",
      ))
        copyFileSync(`drizzle/${file}`, join(history, file));
      const journal = JSON.parse(
        readFileSync("drizzle/meta/_journal.json", "utf8"),
      );
      journal.entries = journal.entries.filter(
        (entry: { idx: number }) => entry.idx < 7,
      );
      writeFileSync(
        join(history, "meta/_journal.json"),
        JSON.stringify(journal),
      );
      await migrate(db, { migrationsFolder: history });
      await beforeMedia(client);
    }
    await client.execute("PRAGMA foreign_keys=ON");
    expect(
      (await client.execute("PRAGMA foreign_keys")).rows[0]?.foreign_keys,
    ).toBe(1);
    if (expectMigrationFailure)
      await expect(
        migrate(db, { migrationsFolder: "drizzle" }),
      ).rejects.toThrow();
    else await migrate(db, { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values({
      id: "actor",
      email: "actor@example.test",
      name: "Actor",
      level: UserLevel.ADMIN,
    });
    await run(db, client);
  } finally {
    client?.close();
    rmSync(directory, { recursive: true, force: true });
    expect(existsSync(directory)).toBe(false);
  }
}
function memoryStorage(bytes: Uint8Array) {
  const objects = new Map<string, Uint8Array>();
  const storage: MediaStorage = {
    getPresignedUrl: vi.fn(async ({ Key }) => {
      objects.set(Key, bytes);
      return `https://upload.example/${Key}`;
    }),
    copyCandidate: vi.fn(async (source, key) => {
      const value = objects.get(source);
      if (!value) throw new Error("missing");
      objects.set(key, value);
    }),
    headObject: vi.fn(async (key) =>
      objects.has(key)
        ? { size: objects.get(key)?.length, type: "image/png" }
        : null,
    ),
    readObject: vi.fn(async (key) => {
      const value = objects.get(key);
      if (!value) throw new Error("missing");
      return value;
    }),
    deleteObjects: vi.fn(async (keys) => {
      for (const key of keys) objects.delete(key);
    }),
  };
  return { storage, objects };
}
async function png() {
  return sharp({
    create: { width: 2, height: 3, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
}
const invalidator = {
  invalidate: vi.fn(async () => ({ state: "completed" as const })),
};
it("preserves historical keys and covers but distinguishes unverified historical rows", () =>
  withDatabase(
    async (db, client) => {
      const [legacy] = await db
        .select()
        .from(schema.media)
        .where(eq(schema.media.id, "legacy"));
      expect(legacy).toMatchObject({
        state: "READY",
        verifiedAt: null,
        key: "old.png",
        url: "https://old.example/old.png",
        name: "original.png",
        size: 123,
        type: "image/png",
        color: "rgb(1,2,3)",
        width: 11,
        height: 12,
        createdAt: "2020-01-01",
        updatedAt: "2021-01-01",
      });
      expect(
        (
          await client.execute(
            "SELECT cover_id FROM post WHERE id = 'old-post'",
          )
        ).rows[0]?.cover_id,
      ).toBe("legacy");
      expect(
        (
          await client.execute(
            "SELECT version, updated_at FROM post WHERE id='old-post'",
          )
        ).rows[0],
      ).toMatchObject({ version: 9, updated_at: "2022-01-01" });
      expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual(
        [],
      );
      expect(
        (
          await client.execute(
            "SELECT name FROM sqlite_master WHERE name LIKE '__migration_0007%' OR name LIKE '__new_media_0007%'",
          )
        ).rows,
      ).toEqual([]);
      await expect(
        client.execute("UPDATE media SET state='invalid'"),
      ).rejects.toThrow();
      await expect(
        client.execute("UPDATE media SET last_error_code='secret-error' "),
      ).rejects.toThrow();
    },
    async (client) => {
      await client.executeMultiple(
        "INSERT INTO user(id,name,email) VALUES('old-user','old','old@example.test'); INSERT INTO category(id,path) VALUES('old-cat','old'); INSERT INTO media(id,key,name,size,type,url,color,width,height,created_at,updated_at) VALUES('legacy','old.png','original.png',123,'image/png','https://old.example/old.png','rgb(1,2,3)',11,12,'2020-01-01','2021-01-01'); INSERT INTO post(id,author_id,category_id,cover_id,version,updated_at) VALUES('old-post','old-user','old-cat','legacy',9,'2022-01-01');",
      );
    },
  ));
it("publishes only decoded candidate bytes and never recopies after READY", () =>
  withDatabase(async (db) => {
    const bytes = await png();
    const { storage, objects } = memoryStorage(bytes);
    const repo = createMediaRepository(db);
    const started = await beginMediaUpload(
      repo,
      storage,
      { name: "x.png", size: bytes.length, type: "image/png" },
      "actor",
    );
    expect(started.uploadUrl).toContain("temporary/");
    expect((await repo.list({})).total).toBe(0);
    const ready = await confirmMediaUpload(repo, storage, started.id, "actor");
    expect(ready.state).toBe("ready");
    const row = await repo.findForUpload(started.id, "actor");
    expect(row.verifiedAt).not.toBeNull();
    if (row.uploadKey) objects.set(row.uploadKey, Buffer.from("changed"));
    expect(
      (await confirmMediaUpload(repo, storage, started.id, "actor")).state,
    ).toBe("ready");
    expect(storage.copyCandidate).toHaveBeenCalledTimes(1);
    expect(objects.get(row.key)).toEqual(bytes);
  }));
it("uncertain copy stays pending when absent then reconciles late arrival without copying again", () =>
  withDatabase(async (db) => {
    const bytes = await png();
    const { storage, objects } = memoryStorage(bytes);
    const repo = createMediaRepository(db);
    storage.copyCandidate = vi.fn(async () => {
      throw new Error("timeout");
    });
    const started = await beginMediaUpload(
      repo,
      storage,
      { name: "x.png", size: bytes.length, type: "image/png" },
      "actor",
    );
    expect(
      (await confirmMediaUpload(repo, storage, started.id, "actor")).state,
    ).toBe("pending");
    const row = await repo.findForUpload(started.id, "actor");
    objects.set(row.key, bytes);
    expect(
      (await confirmMediaUpload(repo, storage, started.id, "actor")).state,
    ).toBe("ready");
    expect(storage.copyCandidate).toHaveBeenCalledTimes(1);
  }));
it("rejects corrupted candidate and retains its recovery record", () =>
  withDatabase(async (db) => {
    const bytes = Buffer.from("bad image");
    const { storage } = memoryStorage(bytes);
    const repo = createMediaRepository(db);
    const started = await beginMediaUpload(
      repo,
      storage,
      { name: "x.png", size: bytes.length, type: "image/png" },
      "actor",
    );
    expect(
      (await confirmMediaUpload(repo, storage, started.id, "actor")).state,
    ).toBe("rejected");
    expect(await repo.status(started.id, "actor")).toMatchObject({
      state: "UPLOADING",
      lastErrorCode: "INVALID_IMAGE",
    });
  }));
it("blocks known covers and body references before any bulk item enters DELETING", () =>
  withDatabase(async (db) => {
    const repo = createMediaRepository(db);
    const { storage } = memoryStorage(await png());
    await db.insert(schema.media).values(
      ["a", "b"].map((id) => ({
        id,
        key: `${id}.png`,
        name: id,
        size: 1,
        type: "image/png",
        url: `https://assets.example.test/${id}.png`,
        state: "READY" as const,
      })),
    );
    await db.insert(schema.category).values({ id: "cat", path: "cat" });
    await db.insert(schema.post).values({
      id: "post",
      authorId: "actor",
      categoryId: "cat",
      coverId: "a",
    });
    await expect(
      destroyMedia(repo, storage, ["a", "b"], invalidator, "actor", true),
    ).rejects.toThrow("引用");
    expect((await repo.list({ state: "DELETING" }, "actor")).total).toBe(0);
    expect(storage.deleteObjects).not.toHaveBeenCalled();
    await db
      .update(schema.post)
      .set({ coverId: null })
      .where(eq(schema.post.id, "post"));
    await db.insert(schema.postTranslation).values({
      postId: "post",
      locale: MultiLangEnum.En,
      content: '<img src="https://assets.example.test/b.png?x=2">',
    });
    await expect(
      destroyMedia(repo, storage, ["a", "b"], invalidator, "actor", true),
    ).rejects.toThrow("引用");
  }));
it("retains DELETING across unknown storage result and resolves absent object to tombstone", () =>
  withDatabase(async (db) => {
    const bytes = await png();
    const { storage, objects } = memoryStorage(bytes);
    const repo = createMediaRepository(db);
    const started = await beginMediaUpload(
      repo,
      storage,
      { name: "x.png", size: bytes.length, type: "image/png" },
      "actor",
    );
    await confirmMediaUpload(repo, storage, started.id, "actor");
    storage.deleteObjects = vi.fn(async () => {
      throw new Error("timeout");
    });
    expect(
      (
        await destroyMedia(
          repo,
          storage,
          [started.id],
          invalidator,
          "actor",
          true,
        )
      ).success,
    ).toBe(false);
    const row = await repo.findForUpload(started.id, "actor");
    expect(row.state).toBe("DELETING");
    await expect(
      confirmMediaUpload(repo, storage, started.id, "actor"),
    ).rejects.toThrow("删除");
    await expect(
      db.transaction((tx) =>
        assertMediaReferencesReady(tx, { coverId: row.id }),
      ),
    ).rejects.toThrow("不可用");
    objects.delete(row.key);
    expect(
      (
        await destroyMedia(
          repo,
          storage,
          [started.id],
          invalidator,
          "actor",
          true,
        )
      ).success,
    ).toBe(true);
    expect(await repo.findForUpload(started.id, "actor")).toMatchObject({
      state: "DELETED",
      key: row.key,
    });
  }));
it("requires risk acknowledgment and returns committed deletion even if refresh fails", () =>
  withDatabase(async (db) => {
    const repo = createMediaRepository(db);
    const { storage } = memoryStorage(await png());
    await expect(
      destroyMedia(repo, storage, [], invalidator, "actor", false),
    ).rejects.toThrow("确认");
    expect(
      await destroyMedia(
        repo,
        storage,
        [],
        {
          invalidate: async () => {
            throw new Error("cache");
          },
        },
        "actor",
        true,
      ),
    ).toEqual({ success: true, publicSync: "degraded" });
  }));
it("concurrent confirmations bind one candidate with one external copy", () =>
  withDatabase(async (db) => {
    const bytes = await png();
    const { storage, objects } = memoryStorage(bytes);
    const repo = createMediaRepository(db);
    const started = await beginMediaUpload(
      repo,
      storage,
      { name: "x.png", size: bytes.length, type: "image/png" },
      "actor",
    );
    let release: () => void = () => undefined;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    storage.copyCandidate = vi.fn(async (source, key) => {
      await wait;
      const value = objects.get(source);
      if (value) objects.set(key, value);
    });
    const first = confirmMediaUpload(repo, storage, started.id, "actor");
    await vi.waitFor(() =>
      expect(storage.copyCandidate).toHaveBeenCalledTimes(1),
    );
    expect(
      (await confirmMediaUpload(repo, storage, started.id, "actor")).state,
    ).toBe("pending");
    release();
    expect((await first).state).toBe("ready");
    expect(storage.copyCandidate).toHaveBeenCalledTimes(1);
  }));
it("prevents other uploaders from confirming or inspecting pending uploads", () =>
  withDatabase(async (db) => {
    const bytes = await png();
    const { storage } = memoryStorage(bytes);
    const repo = createMediaRepository(db);
    await db.insert(schema.user).values({
      id: "editor",
      email: "editor@example.test",
      name: "Editor",
      level: UserLevel.EDITOR,
    });
    const started = await beginMediaUpload(
      repo,
      storage,
      { name: "x.png", size: bytes.length, type: "image/png" },
      "actor",
    );
    await expect(
      confirmMediaUpload(repo, storage, started.id, "editor"),
    ).rejects.toThrow("无权");
    await expect(repo.status(started.id, "editor")).rejects.toThrow("无权");
    expect((await repo.list({ state: "UPLOADING" }, "editor")).total).toBe(0);
  }));
it("guards protocol-relative body references on both save and deletion paths", () =>
  withDatabase(async (db) => {
    const repo = createMediaRepository(db);
    const { storage } = memoryStorage(await png());
    await db.insert(schema.media).values({
      id: "m",
      key: "m.png",
      name: "m",
      size: 1,
      type: "image/png",
      url: "https://assets.example.test/m.png",
      state: "READY",
    });
    await db.insert(schema.page).values({ id: "p", authorId: "actor" });
    await db.insert(schema.pageTranslation).values({
      pageId: "p",
      locale: MultiLangEnum.En,
      title: "Page",
      content: '<img src="//assets.example.test/m.png">',
    });
    await expect(
      destroyMedia(repo, storage, ["m"], invalidator, "actor", true),
    ).rejects.toThrow("引用");
    await db
      .update(schema.media)
      .set({ state: "DELETING" })
      .where(eq(schema.media.id, "m"));
    await expect(
      db.transaction((tx) =>
        assertMediaReferencesReady(tx, {
          content: { en: '<img src="//assets.example.test/m.png">' },
        }),
      ),
    ).rejects.toThrow("不可用");
  }));
it("does not delete a key shared by another historical row", () =>
  withDatabase(async (db) => {
    const repo = createMediaRepository(db);
    const { storage } = memoryStorage(await png());
    await db.insert(schema.media).values(
      ["m1", "m2"].map((id) => ({
        id,
        key: "same.png",
        name: id,
        size: 1,
        type: "image/png",
        url: "https://assets.example.test/same.png",
        state: "READY" as const,
      })),
    );
    await expect(
      destroyMedia(repo, storage, ["m1"], invalidator, "actor", true),
    ).rejects.toThrow("引用");
    expect(storage.deleteObjects).not.toHaveBeenCalled();
  }));
it("late candidate binding cannot revive a deletion tombstone", () =>
  withDatabase(async (db) => {
    const bytes = await png();
    const repo = createMediaRepository(db);
    const { storage } = memoryStorage(bytes);
    const started = await beginMediaUpload(
      repo,
      storage,
      { name: "a.png", size: bytes.length, type: "image/png" },
      "actor",
    );
    await db
      .update(schema.media)
      .set({ state: "DELETED" })
      .where(eq(schema.media.id, started.id));
    expect(
      await repo.bindReady(started.id, "actor", {
        size: bytes.length,
        type: "image/png",
        width: 2,
        height: 3,
        color: null,
      }),
    ).toBeNull();
    expect((await repo.findForUpload(started.id, "actor")).state).toBe(
      "DELETED",
    );
  }));
it("reconciles shared historical key after a partial tombstone commit", () =>
  withDatabase(async (db) => {
    const repo = createMediaRepository(db);
    const { storage } = memoryStorage(await png());
    await db.insert(schema.media).values(
      ["a", "b"].map((id) => ({
        id,
        key: "same.png",
        name: id,
        size: 1,
        type: "image/png",
        url: "https://assets.example.test/same.png",
        state: "READY" as const,
      })),
    );
    const finish = repo.finishDelete;
    repo.finishDelete = vi.fn(async (id) => {
      if (id === "b") throw new Error("lost database response");
      await finish(id);
    });
    expect(
      (
        await destroyMedia(
          repo,
          storage,
          ["a", "b"],
          invalidator,
          "actor",
          true,
        )
      ).success,
    ).toBe(false);
    expect(
      (await db.select().from(schema.media).where(eq(schema.media.id, "a")))[0]
        ?.state,
    ).toBe("DELETED");
    repo.finishDelete = finish;
    expect(
      (
        await destroyMedia(
          repo,
          storage,
          ["a", "b"],
          invalidator,
          "actor",
          true,
        )
      ).success,
    ).toBe(true);
    expect(
      (await db.select().from(schema.media).where(eq(schema.media.id, "b")))[0]
        ?.state,
    ).toBe("DELETED");
  }));

it("matches actual migrated media schema with the generated 0007 snapshot", () =>
  withDatabase(async (_db, client) => {
    const inventory = await inspectSchema(client);
    const table = inventory.tables.find((table) => table.name === "media");
    expect(table).toBeDefined();
    if (!table) throw new Error("Missing media table");
    expect(table.columns.map((column) => column.name)).toEqual(
      Object.values(snapshot.tables.media.columns).map((column) => column.name),
    );
    expect(findSnapshotTableErrors(table, snapshot.tables.media)).toEqual([]);
  }));
it("verifies the copied candidate instead of rechecking a changed temporary source", () =>
  withDatabase(async (db) => {
    const bytes = await png();
    const { storage, objects } = memoryStorage(bytes);
    const repo = createMediaRepository(db);
    const started = await beginMediaUpload(
      repo,
      storage,
      { name: "a.png", size: bytes.length, type: "image/png" },
      "actor",
    );
    storage.copyCandidate = vi.fn(async (source, candidate) => {
      objects.set(candidate, new Uint8Array(bytes.length));
      objects.set(source, bytes);
    });
    expect(
      (await confirmMediaUpload(repo, storage, started.id, "actor")).state,
    ).toBe("rejected");
    expect((await repo.status(started.id, "actor")).state).toBe("UPLOADING");
  }));
it("allows the owning editor and a dedicated upload manager without granting every editor access", () =>
  withDatabase(async (db) => {
    const bytes = await png();
    const { storage } = memoryStorage(bytes);
    const repo = createMediaRepository(db);
    await db.insert(schema.user).values({
      id: "owner",
      email: "owner@example.test",
      name: "Owner",
      level: UserLevel.EDITOR,
    });
    const started = await beginMediaUpload(
      repo,
      storage,
      { name: "a.png", size: bytes.length, type: "image/png" },
      "owner",
    );
    expect((await repo.status(started.id, "owner")).state).toBe("UPLOADING");
    expect((await repo.status(started.id, "actor")).state).toBe("UPLOADING");
    expect((await repo.list({ state: "UPLOADING" }, "actor")).total).toBe(1);
    expect(
      (await confirmMediaUpload(repo, storage, started.id, "owner")).state,
    ).toBe("ready");
  }));

it("rolls back the entire FK-on rebuild if restoring a cover fails", () =>
  withDatabase(
    async (_db, client) => {
      expect(
        (
          await client.execute(
            "SELECT key,name,size FROM media WHERE id='legacy'",
          )
        ).rows[0],
      ).toMatchObject({ key: "old.png", name: "original", size: 123 });
      expect(
        (
          await client.execute(
            "SELECT cover_id,version,updated_at FROM post WHERE id='old-post'",
          )
        ).rows[0],
      ).toMatchObject({
        cover_id: "legacy",
        version: 9,
        updated_at: "2022-01-01",
      });
      expect(
        (await client.execute("PRAGMA table_info(media)")).rows.map(
          (row) => row.name,
        ),
      ).not.toContain("state");
      expect(
        (
          await client.execute(
            "SELECT name FROM sqlite_master WHERE name LIKE '__migration_0007%' OR name LIKE '__new_media_0007%'",
          )
        ).rows,
      ).toEqual([]);
      expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual(
        [],
      );
    },
    async (client) => {
      const before = await inspectSchema(client);
      expect(
        before.tables.flatMap((table) =>
          table.foreignKeys
            .filter((key) => key.table === "media")
            .map((key) => ({
              table: table.name,
              from: key.from,
              onDelete: key.onDelete,
            })),
        ),
      ).toEqual([{ table: "post", from: "cover_id", onDelete: "SET NULL" }]);
      await client.executeMultiple(
        "INSERT INTO user(id,name,email) VALUES('old-user','Old','old@example.test'); INSERT INTO category(id,path) VALUES('old-cat','old'); INSERT INTO media(id,key,name,size,type,url) VALUES('legacy','old.png','original',123,'image/png','https://old.example/old.png'); INSERT INTO post(id,author_id,category_id,cover_id,version,updated_at) VALUES('old-post','old-user','old-cat','legacy',9,'2022-01-01'); CREATE TRIGGER fail_media_restore BEFORE UPDATE OF cover_id ON post WHEN NEW.cover_id IS NOT NULL BEGIN SELECT RAISE(ABORT,'forced restore failure'); END;",
      );
    },
    true,
  ));
