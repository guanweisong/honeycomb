// @vitest-environment node
import { createClient, type Client } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
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
import { describe, expect, it, vi } from "vitest";
import { createPage } from "@/features/page/server/page-commands";
import { createPost } from "@/features/post/server/post-commands";
import { PageTemplate } from "@/features/page/types/page.template";
import * as schema from "@/lib/db/schema";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { createMediaRepository } from "@/features/media/server/media-repository";
import { assertMediaReferencesExist } from "@/features/media/server/media-references";
import {
  prepareMediaUpload,
  registerMediaUpload,
} from "@/features/media/server/media-upload";
import { destroyMedia } from "@/features/media/server/media-delete";
import { type MediaStorage } from "@/features/media/types/media.storage";
import type { MediaUploadIntentInput } from "@/features/media/types/media.upload";
import { createUploadIntent } from "@/features/media/server/upload-intent";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (_name: string, _kind: string, run: () => unknown) =>
    run(),
}));
vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_ASSET_URL: "https://assets.example.test" },
}));

async function withLegacyDatabase(run: (client: Client) => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), "honeycomb-ordinary-media-"));
  let client: Client | undefined;
  const cleanup = () => {
    client?.close();
    rmSync(directory, { recursive: true, force: true });
  };
  const signals = ["SIGHUP", "SIGINT", "SIGTERM"] as const;
  const handlers = signals.map((signal) => {
    const handler = () => {
      cleanup();
      process.exit(1);
    };
    process.once(signal, handler);
    return { signal, handler };
  });
  try {
    const stat = lstatSync(directory);
    expect(stat.isSymbolicLink()).toBe(false);
    expect(stat.uid).toBe(process.getuid?.());
    const migrationsFolder = join(directory, "baseline");
    mkdirSync(join(migrationsFolder, "meta"), { recursive: true });
    for (const file of readdirSync("drizzle").filter((name) =>
      /^000[0-7]_.*\.sql$/.test(name),
    )) {
      copyFileSync(join("drizzle", file), join(migrationsFolder, file));
    }
    const journal: { entries: { idx: number }[] } = JSON.parse(
      readFileSync("drizzle/meta/_journal.json", "utf8"),
    );
    writeFileSync(
      join(migrationsFolder, "meta/_journal.json"),
      JSON.stringify({
        ...journal,
        entries: journal.entries.filter(({ idx }) => idx < 8),
      }),
    );
    client = createClient({ url: `file:${join(directory, "migration.db")}` });
    await migrate(drizzle(client), { migrationsFolder });
    await client.execute(
      "INSERT INTO user (id, email, level, status) VALUES ('author', 'author@example.test', 'ADMIN', 'ENABLE')",
    );
    await run(client);
  } finally {
    cleanup();
    handlers.forEach(({ signal, handler }) =>
      process.removeListener(signal, handler),
    );
    expect(existsSync(directory)).toBe(false);
  }
}

async function fixture() {
  const bytes = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const input: MediaUploadIntentInput = {
    name: "test.png",
    type: "image/png",
    size: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
  const signed = createUploadIntent(input, "author");
  const storage = {
    getPresignedUrl: vi
      .fn<MediaStorage["getPresignedUrl"]>()
      .mockResolvedValue("https://upload.example.test"),
    putValidatedObject: vi
      .fn<MediaStorage["putValidatedObject"]>()
      .mockResolvedValue(undefined),
    headObject: vi.fn<MediaStorage["headObject"]>().mockResolvedValue(null),
    readObject: vi.fn<MediaStorage["readObject"]>().mockResolvedValue(bytes),
    deleteObjects: vi
      .fn<MediaStorage["deleteObjects"]>()
      .mockResolvedValue(undefined),
  };
  return { input, signed, storage };
}
const unavailable = { code: "SERVICE_UNAVAILABLE" };

describe("ordinary media deployment readiness", () => {
  it.each([
    "list",
    "prepare",
    "register",
    "insert",
    "delete",
    "references",
    "empty references",
  ])("rejects %s against 0007 before storage or writes", async (operation) => {
    await withLegacyDatabase(async (client) => {
      const db = drizzle(client, { schema });
      const repository = createMediaRepository(db);
      const { input, signed, storage } = await fixture();
      await client.execute(
        "INSERT INTO media (id, key, name, size, type, url, state) VALUES ('retired', 'retired', 'retired', 1, 'image/png', 'https://assets.example.test/retired', 'DELETING')",
      );
      const before = (await client.execute("SELECT * FROM media")).rows;
      const invalidator = {
        invalidate: vi.fn().mockResolvedValue({ state: "completed" }),
      };
      const metadata = {
        size: input.size,
        type: input.type,
        color: null,
        width: 2,
        height: 2,
      };
      const calls: Record<string, () => Promise<unknown>> = {
        list: () => repository.list({}),
        prepare: () => prepareMediaUpload(repository, storage, input, "author"),
        register: () =>
          registerMediaUpload(repository, storage, signed.intent, "author"),
        insert: () =>
          repository.insertRegistered(
            signed.payload,
            "media/test.png",
            metadata,
            "author",
          ),
        delete: () =>
          destroyMedia(
            repository,
            storage,
            [signed.payload.id],
            invalidator,
            "author",
            true,
          ),
        references: () =>
          db.transaction((tx) =>
            assertMediaReferencesExist(tx, { coverId: signed.payload.id }),
          ),
        "empty references": () =>
          db.transaction((tx) => assertMediaReferencesExist(tx, {})),
      };
      const call = calls[operation];
      if (!call) throw new Error("Unknown test operation");
      await expect(call()).rejects.toMatchObject(unavailable);
      for (const call of Object.values(storage))
        expect(call).not.toHaveBeenCalled();
      expect(invalidator.invalidate).not.toHaveBeenCalled();
      expect((await client.execute("SELECT * FROM media")).rows).toEqual(
        before,
      );
    });
  });
  it("rolls back real post and page creates on 0007 even without media references", async () => {
    await withLegacyDatabase(async (client) => {
      const db = drizzle(client, { schema });
      const invalidator = {
        invalidate: vi.fn().mockResolvedValue({ state: "completed" }),
      };
      const categoryId = "111111111111111111111111";
      await client.execute({
        sql: "INSERT INTO category (id, path) VALUES (?, 'category')",
        args: [categoryId],
      });
      const creationToken = "11111111-1111-4111-8111-111111111111";
      await expect(
        createPost(db, { categoryId, creationToken }, "author", invalidator),
      ).rejects.toMatchObject(unavailable);
      await expect(
        createPage(
          db,
          {
            title: { zh: "标题", en: "Title" },
            content: { zh: "正文", en: "Content" },
            template: PageTemplate.DEFAULT,
            creationToken,
          },
          "author",
          invalidator,
        ),
      ).rejects.toMatchObject(unavailable);
      for (const table of [
        "post",
        "post_translation",
        "page",
        "page_translation",
      ])
        expect((await client.execute(`SELECT * FROM ${table}`)).rows).toEqual(
          [],
        );
      expect(invalidator.invalidate).not.toHaveBeenCalled();
    });
  });
  it("preserves actor authorization errors on an incompatible schema", async () => {
    await withLegacyDatabase(async (client) => {
      const repository = createMediaRepository(drizzle(client, { schema }));
      await expect(repository.authorizeUpload("absent")).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      await expect(
        repository.findRegistered("unknown", "absent"),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(
        repository.deleteWithStorage([], "absent", async () => {}),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
  it("fails closed when schema introspection is unavailable", async () => {
    await withLegacyDatabase(async (client) => {
      const db = drizzle(client, { schema });
      vi.spyOn(db, "all").mockRejectedValue(
        new Error("introspection unavailable"),
      );
      await expect(createMediaRepository(db).list({})).rejects.toMatchObject(
        unavailable,
      );
    });
  });
  it("permits the same repository after 0008 without a cached readiness result", async () => {
    await withLegacyDatabase(async (client) => {
      const db = drizzle(client, { schema });
      const repository = createMediaRepository(db);
      await expect(repository.list({})).rejects.toMatchObject(unavailable);
      await migrate(db, { migrationsFolder: "drizzle" });
      const { input, storage } = await fixture();
      const prepared = await prepareMediaUpload(
        repository,
        storage,
        input,
        "author",
      );
      const registered = await registerMediaUpload(
        repository,
        storage,
        prepared.intent,
        "author",
      );
      expect(storage.putValidatedObject).toHaveBeenCalledOnce();
      expect((await repository.list({})).list).toEqual([registered]);
      await db.transaction((tx) =>
        assertMediaReferencesExist(tx, { coverId: registered.id }),
      );
      await db.transaction((tx) => assertMediaReferencesExist(tx, {}));
      await destroyMedia(
        repository,
        storage,
        [registered.id],
        { invalidate: async () => ({ state: "completed" }) },
        "author",
        true,
      );
      expect(storage.headObject).toHaveBeenCalled();
      expect((await repository.list({})).list).toEqual([]);
    });
  });
  it.each(
    [[], [{ name: 1 }], [{ unexpected: "id" }], [{ name: "id" }]].map(
      (rows) => ({ rows }),
    ),
  )(
    "fails closed for invalid or incomplete introspection $rows",
    async ({ rows }) => {
      await withLegacyDatabase(async (client) => {
        const db = drizzle(client, { schema });
        vi.spyOn(db, "all").mockResolvedValue(rows);
        await expect(createMediaRepository(db).list({})).rejects.toMatchObject(
          unavailable,
        );
      });
    },
  );
});
