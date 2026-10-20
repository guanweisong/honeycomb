// @vitest-environment node
import { createClient, type Client } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { getTableConfig } from "drizzle-orm/sqlite-core";
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
import { describe, expect, it } from "vitest";
import { media } from "@/lib/db/schema/content-media";

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
    await client.executeMultiple(`
      INSERT INTO user (id, email) VALUES ('author', 'author@example.test'), ('other', 'other@example.test');
      INSERT INTO category (id, path) VALUES ('category', 'category');
      INSERT INTO media (id, key, name, size, type, url, state, color, height, width, created_at, updated_at) VALUES ('cover', 'cover', 'cover', 1, 'image/png', 'https://example.test/cover.png', 'READY', '#123456', 4, 5, '2020-01-01', '2021-01-01');
      INSERT INTO post (id, author_id, category_id, cover_id, views) VALUES ('legacy', 'author', 'category', 'cover', 7);
      INSERT INTO post_translation (post_id, locale, title, content) VALUES ('legacy', 'zh', '标题', '正文'), ('legacy', 'en', 'Title', 'Content');
      INSERT INTO tag (id) VALUES ('tag');
      INSERT INTO post_tag (post_id, tag_id, type) VALUES ('legacy', 'tag', 'ACTOR');
      INSERT INTO comment (id, author, content, email, post_id) VALUES ('comment', 'Reader', 'Comment', 'reader@example.test', 'legacy');
    `);
    await run(client);
  } finally {
    cleanup();
    handlers.forEach(({ signal, handler }) =>
      process.removeListener(signal, handler),
    );
    expect(existsSync(directory)).toBe(false);
  }
}

describe("ordinary media migration", () => {
  const columns = [
    "id",
    "key",
    "name",
    "size",
    "type",
    "url",
    "color",
    "height",
    "width",
    "created_at",
    "updated_at",
  ];
  it("declares only ordinary metadata in the authoritative schema", () => {
    expect(getTableConfig(media).columns.map(({ name }) => name)).toEqual(
      columns,
    );
  });
  it("preserves metadata, covers and dependent rows with foreign keys enabled", async () => {
    await withLegacyDatabase(async (client) => {
      const before = (
        await client.execute(`SELECT ${columns.join(",")} FROM media`)
      ).rows;
      const posts = (await client.execute("SELECT * FROM post")).rows;
      const translations = (
        await client.execute("SELECT * FROM post_translation")
      ).rows;
      await migrate(drizzle(client), { migrationsFolder: "drizzle" });
      expect((await client.execute("SELECT * FROM media")).rows).toEqual(
        before,
      );
      expect((await client.execute("SELECT * FROM post")).rows).toEqual(posts);
      expect(
        (await client.execute("SELECT * FROM post_translation")).rows,
      ).toEqual(translations);
      expect(
        (await client.execute("PRAGMA table_info(media)")).rows.map(
          (row) => row.name,
        ),
      ).toEqual(columns);
      expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual(
        [],
      );
      expect(
        (await client.execute("PRAGMA foreign_keys")).rows[0]?.foreign_keys,
      ).toBe(1);
      await expect(
        client.execute("UPDATE media SET size = -1"),
      ).rejects.toThrow(/check constraint/i);
      await expect(
        client.execute("UPDATE media SET height = -1"),
      ).rejects.toThrow(/check constraint/i);
      await expect(
        client.execute("UPDATE media SET width = -1"),
      ).rejects.toThrow(/check constraint/i);
      await client.execute("DELETE FROM media WHERE id = 'cover'");
      expect(
        (await client.execute("SELECT cover_id FROM post")).rows[0]?.cover_id,
      ).toBeNull();
      expect(
        (await client.execute("SELECT * FROM post_translation")).rows,
      ).toEqual(translations);
    });
  });
  it.each(["UPLOADING", "DELETING", "DELETED"])(
    "rejects unresolved %s rows without changing data or migration history",
    async (state) => {
      await withLegacyDatabase(async (client) => {
        await client.execute({
          sql: "INSERT INTO media (id, key, name, size, type, url, state) VALUES ('unresolved', 'unresolved', 'unresolved', 0, 'image/png', 'https://example.test/unresolved', ?)",
          args: [state],
        });
        const rows = (await client.execute("SELECT * FROM media ORDER BY id"))
          .rows;
        const posts = (await client.execute("SELECT * FROM post")).rows;
        const journal = (
          await client.execute("SELECT * FROM __drizzle_migrations")
        ).rows;
        await expect(
          migrate(drizzle(client), { migrationsFolder: "drizzle" }),
        ).rejects.toThrow();
        expect(
          (await client.execute("SELECT * FROM media ORDER BY id")).rows,
        ).toEqual(rows);
        expect((await client.execute("SELECT * FROM post")).rows).toEqual(
          posts,
        );
        expect(
          (await client.execute("SELECT * FROM __drizzle_migrations")).rows,
        ).toEqual(journal);
        expect(
          (
            await client.execute(
              "SELECT name FROM sqlite_master WHERE name LIKE '__%0008%'",
            )
          ).rows,
        ).toEqual([]);
      });
    },
  );
  it("rolls back the table rebuild and cover restoration if a later statement fails", async () => {
    await withLegacyDatabase(async (client) => {
      await client.execute(
        "CREATE TRIGGER reject_restored_cover BEFORE UPDATE OF cover_id ON post WHEN NEW.cover_id IS NOT NULL BEGIN SELECT RAISE(ABORT, 'restore rejected'); END",
      );
      const rows = (await client.execute("SELECT * FROM media")).rows;
      const posts = (await client.execute("SELECT * FROM post")).rows;
      const journal = (
        await client.execute("SELECT * FROM __drizzle_migrations")
      ).rows;
      await expect(
        migrate(drizzle(client), { migrationsFolder: "drizzle" }),
      ).rejects.toThrow(/restore rejected/);
      expect((await client.execute("SELECT * FROM media")).rows).toEqual(rows);
      expect((await client.execute("SELECT * FROM post")).rows).toEqual(posts);
      expect(
        (await client.execute("SELECT * FROM __drizzle_migrations")).rows,
      ).toEqual(journal);
      expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual(
        [],
      );
    });
  });
});
