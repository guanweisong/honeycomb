// @vitest-environment node
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import { expect, it, vi } from "vitest";
import { requireDefined } from "@tests/helpers/require-defined";
import sharp from "sharp";
import * as schema from "@/lib/db/schema";
import { MultiLangEnum } from "@/lib/i18n/i18n";
import { UserLevel } from "@/features/user/user";
import { createMediaRepository } from "./media-repository";
import {
  prepareMediaUpload,
  registerMediaUpload,
  destroyMedia,
  type MediaStorage,
} from "../server";
import { verifyUploadIntent } from "./upload-intent";
vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_ASSET_URL: "https://assets.example.test" },
}));
async function withDatabase(
  run: (
    db: ReturnType<typeof drizzle<typeof schema>>,
    url: string,
  ) => Promise<void>,
) {
  const directory = mkdtempSync(join(tmpdir(), "honeycomb-registration-"));
  let client: ReturnType<typeof createClient> | undefined;
  try {
    expect(lstatSync(directory).isSymbolicLink()).toBe(false);
    if (process.getuid) expect(lstatSync(directory).uid).toBe(process.getuid());
    client = createClient({
      url: `file:${join(directory, "test.db")}`,
      authToken: "local-test-sentinel",
    });
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "drizzle" });
    await client.execute("PRAGMA foreign_keys=ON");
    await db.insert(schema.user).values({
      id: "actor",
      email: "actor@example.test",
      name: "Actor",
      level: UserLevel.ADMIN,
    });
    await run(db, `file:${join(directory, "test.db")}`);
  } finally {
    client?.close();
    rmSync(directory, { recursive: true, force: true });
    expect(existsSync(directory)).toBe(false);
  }
}
async function fixture(db: Parameters<typeof createMediaRepository>[0]) {
  const bytes = await sharp({
    create: { width: 2, height: 3, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const objects = new Map<string, Uint8Array>();
  const storage = {
    getPresignedUrl: vi.fn<MediaStorage["getPresignedUrl"]>(async ({ Key }) => {
      objects.set(Key, bytes);
      return `https://upload.example/${Key}`;
    }),
    putValidatedObject: vi.fn<MediaStorage["putValidatedObject"]>(
      async (key, body) => {
        objects.set(key, body);
      },
    ),
    headObject: vi.fn<MediaStorage["headObject"]>(async (key) =>
      objects.has(key)
        ? { size: objects.get(key)?.length, type: "image/png" }
        : null,
    ),
    readObject: vi.fn<MediaStorage["readObject"]>(async (key) => {
      const body = objects.get(key);
      if (!body) throw new Error("missing");
      return body;
    }),
    deleteObjects: vi.fn<MediaStorage["deleteObjects"]>(async (keys) => {
      for (const key of keys) objects.delete(key);
    }),
  };
  const repo = createMediaRepository(db);
  const started = await prepareMediaUpload(
    repo,
    storage,
    {
      name: "a.png",
      type: "image/png",
      size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    },
    "actor",
  );
  return { repo, storage, started, objects, bytes };
}
const invalidator = {
  invalidate: vi.fn(async () => ({ state: "completed" as const })),
};
it("creates no provisional row and registers exact decoded bytes with ordinary fields", () =>
  withDatabase(async (db) => {
    const { repo, storage, started, objects, bytes } = await fixture(db);
    expect((await repo.list({})).total).toBe(0);
    const media = await registerMediaUpload(
      repo,
      storage,
      started.intent,
      "actor",
    );
    expect(media).toMatchObject({ width: 2, height: 3, size: bytes.length });
    expect(media).not.toHaveProperty("state");
    expect(objects.get(media.key)).toEqual(bytes);
    const upload = verifyUploadIntent(started.intent, "actor");
    objects.set(upload.uploadKey, Buffer.from("overwritten"));
    expect(
      await registerMediaUpload(repo, storage, started.intent, "actor"),
    ).toEqual(media);
    expect(storage.putValidatedObject).toHaveBeenCalledTimes(1);
  }));
it("checks revoked permission before returning an existing record", () =>
  withDatabase(async (db) => {
    const { repo, storage, started } = await fixture(db);
    await registerMediaUpload(repo, storage, started.intent, "actor");
    await db
      .update(schema.user)
      .set({ level: UserLevel.GUEST })
      .where(eq(schema.user.id, "actor"));
    await expect(
      registerMediaUpload(repo, storage, started.intent, "actor"),
    ).rejects.toThrow("无权");
    expect(storage.putValidatedObject).toHaveBeenCalledTimes(1);
  }));
it("rechecks permission after final PUT and preserves the orphan candidate", () =>
  withDatabase(async (db) => {
    const { repo, storage, started, objects } = await fixture(db);
    storage.putValidatedObject.mockImplementation(async (key, bytes) => {
      objects.set(key, bytes);
      await db
        .update(schema.user)
        .set({ level: UserLevel.GUEST })
        .where(eq(schema.user.id, "actor"));
    });
    await expect(
      registerMediaUpload(repo, storage, started.intent, "actor"),
    ).rejects.toThrow("无权");
    expect((await repo.list({})).total).toBe(0);
    expect(
      [...objects.keys()].filter((key) => key.startsWith("media/")),
    ).toHaveLength(1);
    expect(storage.deleteObjects).not.toHaveBeenCalled();
  }));
it("preserves a single row and returns the winning key for repeated insert attempts", () =>
  withDatabase(async (db) => {
    const { repo, storage, started } = await fixture(db);
    const media = await registerMediaUpload(
      repo,
      storage,
      started.intent,
      "actor",
    );
    const payload = verifyUploadIntent(started.intent, "actor");
    const second = await repo.insertRegistered(
      payload,
      "media/other.png",
      { size: media.size, type: media.type, width: 2, height: 3, color: null },
      "actor",
    );
    expect(second).toEqual(media);
    expect((await repo.list({})).total).toBe(1);
  }));
it("blocks an entire delete batch before storage when a known cover refers to one row", () =>
  withDatabase(async (db) => {
    const first = await fixture(db);
    const a = await registerMediaUpload(
      first.repo,
      first.storage,
      first.started.intent,
      "actor",
    );
    const second = await fixture(db);
    const b = await registerMediaUpload(
      second.repo,
      second.storage,
      second.started.intent,
      "actor",
    );
    await db.insert(schema.category).values({ id: "cat", path: "cat" });
    await db.insert(schema.post).values({
      id: "post",
      authorId: "actor",
      categoryId: "cat",
      coverId: b.id,
    });
    await expect(
      destroyMedia(
        first.repo,
        first.storage,
        [a.id, b.id],
        invalidator,
        "actor",
        true,
      ),
    ).rejects.toThrow("引用");
    expect(first.storage.headObject).not.toHaveBeenCalled();
    expect((await first.repo.list({})).total).toBe(2);
  }));
it("deletes objects first and physically removes ordinary rows", () =>
  withDatabase(async (db) => {
    const { repo, storage, started, objects } = await fixture(db);
    const media = await registerMediaUpload(
      repo,
      storage,
      started.intent,
      "actor",
    );
    storage.deleteObjects.mockImplementation(async (keys) => {
      expect(await repo.list({})).toMatchObject({ total: 1 });
      for (const key of keys) objects.delete(key);
    });
    expect(
      await destroyMedia(repo, storage, [media.id], invalidator, "actor", true),
    ).toEqual({ success: true, publicSync: "completed" });
    expect((await repo.list({})).total).toBe(0);
    expect(objects.has(media.key)).toBe(false);
  }));
it("retains the whole batch after partial bulk object deletion failure", () =>
  withDatabase(async (db) => {
    const { repo, storage, started, objects, bytes } = await fixture(db);
    const media = await registerMediaUpload(
      repo,
      storage,
      started.intent,
      "actor",
    );
    const second = {
      ...media,
      id: "second",
      key: "media/second.png",
      url: "https://assets.example.test/media/second.png",
    };
    await db.insert(schema.media).values(second);
    objects.set(second.key, bytes);
    storage.deleteObjects.mockImplementation(async (keys) => {
      objects.delete(requireDefined(keys[0]));
      throw new Error("partial deletion");
    });
    await expect(
      destroyMedia(
        repo,
        storage,
        [media.id, second.id],
        invalidator,
        "actor",
        true,
      ),
    ).rejects.toThrow("部分删除");
    expect((await repo.list({})).total).toBe(2);
    expect(storage.deleteObjects).toHaveBeenCalledTimes(1);
    const deletedKeys = requireDefined(storage.deleteObjects.mock.calls[0])[0];
    expect(deletedKeys).toEqual(
      expect.arrayContaining([media.key, second.key]),
    );
    expect(deletedKeys).toHaveLength(2);
    expect(storage.headObject).not.toHaveBeenCalled();
    expect(
      [...objects.keys()].filter(
        (key) => key === media.key || key === second.key,
      ),
    ).toHaveLength(1);
  }));
it("can manually register again after deletion while the signed intent remains valid", () =>
  withDatabase(async (db) => {
    const { repo, storage, started } = await fixture(db);
    const first = await registerMediaUpload(
      repo,
      storage,
      started.intent,
      "actor",
    );
    await destroyMedia(repo, storage, [first.id], invalidator, "actor", true);
    const second = await registerMediaUpload(
      repo,
      storage,
      started.intent,
      "actor",
    );
    expect(second.id).toBe(first.id);
    expect(second.key).not.toBe(first.key);
  }));
it("concurrent registrations publish distinct keys but return the single winning record", () =>
  withDatabase(async (db) => {
    const { repo, storage, started, objects } = await fixture(db);
    let release: () => void = () => undefined;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    storage.putValidatedObject.mockImplementationOnce(async (key, bytes) => {
      await wait;
      objects.set(key, bytes);
    });
    const first = registerMediaUpload(repo, storage, started.intent, "actor");
    await vi.waitFor(() =>
      expect(storage.putValidatedObject).toHaveBeenCalledTimes(1),
    );
    const winner = await registerMediaUpload(
      repo,
      storage,
      started.intent,
      "actor",
    );
    release();
    expect(await first).toEqual(winner);
    expect((await repo.list({})).total).toBe(1);
    expect(storage.putValidatedObject.mock.calls[0]?.[0]).not.toBe(
      storage.putValidatedObject.mock.calls[1]?.[0],
    );
    expect(storage.deleteObjects).not.toHaveBeenCalled();
  }));
it("does not delete a registered candidate when the database commit response is lost", () =>
  withDatabase(async (db) => {
    const { repo, storage, started, objects } = await fixture(db);
    const insert = repo.insertRegistered;
    repo.insertRegistered = async (...args) => {
      await insert(...args);
      throw new Error("response lost");
    };
    await expect(
      registerMediaUpload(repo, storage, started.intent, "actor"),
    ).rejects.toThrow("登记结果无法确认");
    const rows = await repo.list({});
    expect(rows.total).toBe(1);
    expect(objects.has(rows.list[0]?.key ?? "missing")).toBe(true);
    expect(storage.deleteObjects).not.toHaveBeenCalled();
    expect(
      await registerMediaUpload(repo, storage, started.intent, "actor"),
    ).toEqual(rows.list[0]);
  }));
it("never re-reads the mutable temporary source after validating it", () =>
  withDatabase(async (db) => {
    const { repo, storage, started, objects, bytes } = await fixture(db);
    const payload = verifyUploadIntent(started.intent, "actor");
    storage.putValidatedObject.mockImplementation(async (key, body) => {
      objects.set(payload.uploadKey, Buffer.alloc(bytes.length));
      objects.set(key, body);
    });
    const media = await registerMediaUpload(
      repo,
      storage,
      started.intent,
      "actor",
    );
    expect(objects.get(media.key)).toEqual(bytes);
    expect(storage.readObject).toHaveBeenCalledTimes(1);
  }));
it("keeps shared historical keys protected by another ordinary row", () =>
  withDatabase(async (db) => {
    const { repo, storage } = await fixture(db);
    await db.insert(schema.media).values(
      ["a", "b"].map((id) => ({
        id,
        key: "shared.png",
        name: "a.png",
        size: 1,
        type: "image/png",
        url: "https://assets.example.test/shared.png",
      })),
    );
    await expect(
      destroyMedia(repo, storage, ["a"], invalidator, "actor", true),
    ).rejects.toThrow("引用");
    expect(storage.deleteObjects).not.toHaveBeenCalled();
  }));
it("checks known body references before deleting and rejects new references after deletion", () =>
  withDatabase(async (db) => {
    const { assertMediaReferencesExist } = await import("./media-references");
    const { repo, storage, started } = await fixture(db);
    const media = await registerMediaUpload(
      repo,
      storage,
      started.intent,
      "actor",
    );
    const content = { en: `<img src="${media.url}">` };
    await db.insert(schema.page).values({ id: "page", authorId: "actor" });
    await db.transaction(async (tx) => {
      await assertMediaReferencesExist(tx, { content });
      await tx.insert(schema.pageTranslation).values({
        pageId: "page",
        locale: MultiLangEnum.En,
        title: "Page",
        content: content.en,
      });
    });
    await expect(
      destroyMedia(repo, storage, [media.id], invalidator, "actor", true),
    ).rejects.toThrow("引用");
    await db
      .delete(schema.pageTranslation)
      .where(eq(schema.pageTranslation.pageId, "page"));
    await destroyMedia(repo, storage, [media.id], invalidator, "actor", true);
    await expect(
      db.transaction(async (tx) => {
        await assertMediaReferencesExist(tx, { content });
        await tx.insert(schema.pageTranslation).values({
          pageId: "page",
          locale: MultiLangEnum.En,
          title: "Page",
          content: content.en,
        });
      }),
    ).rejects.toThrow("不可用");
  }));
it("serializes deletion against a competing content write without creating a broken reference", () =>
  withDatabase(async (db, url) => {
    const { assertMediaReferencesExist } = await import("./media-references");
    const { repo, storage, started, objects } = await fixture(db);
    const media = await registerMediaUpload(
      repo,
      storage,
      started.intent,
      "actor",
    );
    await db.insert(schema.page).values({ id: "race-page", authorId: "actor" });
    const competingClient = createClient({
      url,
      authToken: "local-test-sentinel",
    });
    let release: () => void = () => undefined;
    const wait = new Promise<void>((resolve) => {
      release = resolve;
    });
    let entered: () => void = () => undefined;
    const enteredPromise = new Promise<void>((resolve) => {
      entered = resolve;
    });
    storage.deleteObjects.mockImplementation(async (keys) => {
      entered();
      await wait;
      for (const key of keys) objects.delete(key);
    });
    const deletion = destroyMedia(
      repo,
      storage,
      [media.id],
      invalidator,
      "actor",
      true,
    );
    try {
      await enteredPromise;
      await competingClient.execute("PRAGMA busy_timeout=1");
      const competing = drizzle(competingClient, { schema });
      const writing = competing.transaction(async (tx) => {
        const content = { en: `<img src="${media.url}">` };
        await assertMediaReferencesExist(tx, { content });
        await tx.insert(schema.pageTranslation).values({
          pageId: "race-page",
          locale: MultiLangEnum.En,
          title: "Race",
          content: content.en,
        });
      });
      // Capture rejection immediately; a local busy writer is also a safe rejected save.
      const outcome = writing.then(
        () => "committed",
        () => "rejected",
      );
      await Promise.race([
        outcome,
        new Promise<void>((resolve) => setTimeout(resolve, 20)),
      ]);
      release();
      await deletion;
      expect(await outcome).toBe("rejected");
      expect(
        await db
          .select()
          .from(schema.pageTranslation)
          .where(eq(schema.pageTranslation.pageId, "race-page")),
      ).toEqual([]);
    } finally {
      release();
      try {
        await deletion;
      } finally {
        competingClient.close();
      }
    }
  }));
it("a late unknown PUT cannot overwrite the fresh key used by a manual retry", () =>
  withDatabase(async (db) => {
    const { repo, storage, started, objects } = await fixture(db);
    let lateWrite: () => void = () => undefined;
    storage.putValidatedObject.mockImplementationOnce(async (key, bytes) => {
      lateWrite = () => {
        objects.set(key, bytes);
      };
      throw new Error("timeout before response");
    });
    await expect(
      registerMediaUpload(repo, storage, started.intent, "actor"),
    ).rejects.toThrow("对象写入结果无法确认");
    expect((await repo.list({})).total).toBe(0);
    expect(storage.headObject).not.toHaveBeenCalled();
    const registered = await registerMediaUpload(
      repo,
      storage,
      started.intent,
      "actor",
    );
    const firstKey = storage.putValidatedObject.mock.calls[0]?.[0];
    expect(firstKey).not.toBe(registered.key);
    expect(storage.deleteObjects).not.toHaveBeenCalled();
    await destroyMedia(
      repo,
      storage,
      [registered.id],
      invalidator,
      "actor",
      true,
    );
    lateWrite();
    expect((await repo.list({})).total).toBe(0);
    expect(objects.has(registered.key)).toBe(false);
    expect(objects.has(firstKey ?? "missing")).toBe(true);
  }));
