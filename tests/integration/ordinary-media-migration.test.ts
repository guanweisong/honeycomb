// @vitest-environment node
import type { Client } from "@libsql/client/node";
import {
  withTestDatabase,
  prepareMigrationFolder,
} from "@tests/helpers/local-test-database";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { media } from "@/lib/db/schema/content-media";

async function withLegacyDatabase(run: (client: Client) => Promise<void>) {
  return withTestDatabase(async (client, directory) => {
    const migrationsFolder = prepareMigrationFolder(directory, 7);
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
  });
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
  it("preserves metadata, covers and dependent rows through the actual Drizzle migrator", async () => {
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
  it("replays exact 0008 with foreign keys enabled throughout and restores DROP-nullified covers", async () => {
    await withLegacyDatabase(async (client) => {
      await client.execute("PRAGMA foreign_keys=ON");
      await client.execute(
        "UPDATE post SET version = 7, created_at = '2020-01-02', updated_at = '2021-02-03' WHERE id = 'legacy'",
      );
      const before = (
        await client.execute(`SELECT ${columns.join(",")} FROM media`)
      ).rows;
      const posts = (await client.execute("SELECT * FROM post")).rows;
      const translations = (
        await client.execute("SELECT * FROM post_translation")
      ).rows;
      const journal = (
        await client.execute("SELECT * FROM __drizzle_migrations")
      ).rows;
      const statements = readFileSync("drizzle/0008_ordinary_media.sql", "utf8")
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean);
      const tx = await client.transaction("write");
      let observedCoverNullification = false;
      try {
        for (const statement of statements) {
          expect(
            (await tx.execute("PRAGMA foreign_keys")).rows[0]?.foreign_keys,
          ).toBe(1);
          await tx.execute(statement);
          if (statement === "DROP TABLE `media`;") {
            expect(
              (
                await tx.execute(
                  "SELECT cover_id FROM post WHERE id = 'legacy'",
                )
              ).rows,
            ).toEqual([{ cover_id: null }]);
            observedCoverNullification = true;
          }
        }
        expect(
          (await tx.execute("PRAGMA foreign_keys")).rows[0]?.foreign_keys,
        ).toBe(1);
        expect(observedCoverNullification).toBe(true);
        expect((await tx.execute("SELECT * FROM media")).rows).toEqual(before);
        expect((await tx.execute("SELECT * FROM post")).rows).toEqual(posts);
        expect((await tx.execute("PRAGMA foreign_key_check")).rows).toEqual([]);
        await tx.commit();
      } finally {
        if (!tx.closed) await tx.rollback();
        tx.close();
      }
      expect((await client.execute("SELECT * FROM media")).rows).toEqual(
        before,
      );
      expect((await client.execute("SELECT * FROM post")).rows).toEqual(posts);
      expect(
        (await client.execute("SELECT * FROM post_translation")).rows,
      ).toEqual(translations);
      expect(
        (await client.execute("SELECT * FROM __drizzle_migrations")).rows,
      ).toEqual(journal);
      expect(
        (await client.execute("PRAGMA table_info(media)")).rows.map(
          (row) => row.name,
        ),
      ).toEqual(columns);
      expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual(
        [],
      );
    });
  });

  it("rolls back exact 0008 after FK-enabled DROP and injected cover-restoration failure", async () => {
    await withLegacyDatabase(async (client) => {
      await client.execute("PRAGMA foreign_keys=ON");
      await client.execute(
        "UPDATE post SET version = 9, created_at = '2020-01-02', updated_at = '2021-02-03' WHERE id = 'legacy'",
      );
      await client.execute(
        "CREATE TRIGGER reject_fk_enabled_restore BEFORE UPDATE OF cover_id ON post WHEN NEW.cover_id IS NOT NULL BEGIN SELECT RAISE(ABORT, 'FK-enabled restoration rejected'); END",
      );
      const rows = (await client.execute("SELECT * FROM media")).rows;
      const posts = (await client.execute("SELECT * FROM post")).rows;
      const translations = (
        await client.execute("SELECT * FROM post_translation")
      ).rows;
      const journal = (
        await client.execute("SELECT * FROM __drizzle_migrations")
      ).rows;
      const originalColumns = (await client.execute("PRAGMA table_info(media)"))
        .rows;
      const statements = readFileSync("drizzle/0008_ordinary_media.sql", "utf8")
        .split("--> statement-breakpoint")
        .map((statement) => statement.trim())
        .filter(Boolean);
      const tx = await client.transaction("write");
      let observedCoverNullification = false;
      try {
        await expect(
          (async () => {
            for (const statement of statements) {
              expect(
                (await tx.execute("PRAGMA foreign_keys")).rows[0]?.foreign_keys,
              ).toBe(1);
              await tx.execute(statement);
              if (statement === "DROP TABLE `media`;") {
                expect(
                  (
                    await tx.execute(
                      "SELECT cover_id FROM post WHERE id = 'legacy'",
                    )
                  ).rows,
                ).toEqual([{ cover_id: null }]);
                observedCoverNullification = true;
              }
            }
          })(),
        ).rejects.toThrow(/FK-enabled restoration rejected/);
        expect(observedCoverNullification).toBe(true);
        expect(
          (await tx.execute("PRAGMA foreign_keys")).rows[0]?.foreign_keys,
        ).toBe(1);
      } finally {
        if (!tx.closed) await tx.rollback();
        tx.close();
      }
      expect((await client.execute("SELECT * FROM media")).rows).toEqual(rows);
      expect((await client.execute("SELECT * FROM post")).rows).toEqual(posts);
      expect(
        (await client.execute("SELECT * FROM post_translation")).rows,
      ).toEqual(translations);
      expect(
        (await client.execute("SELECT * FROM __drizzle_migrations")).rows,
      ).toEqual(journal);
      expect((await client.execute("PRAGMA table_info(media)")).rows).toEqual(
        originalColumns,
      );
      expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual(
        [],
      );
      expect(
        (
          await client.execute(
            "SELECT name FROM sqlite_master WHERE name LIKE '__%0008%'",
          )
        ).rows,
      ).toEqual([]);
    });
  });
});
