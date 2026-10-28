// @vitest-environment node
import type { Client } from "@libsql/client/node";
import {
  withTestDatabase,
  prepareMigrationFolder,
} from "@tests/helpers/local-test-database";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { getTableConfig } from "drizzle-orm/sqlite-core";

import { describe, expect, it } from "vitest";
import { post } from "@/lib/db/schema/content-post";

async function withLegacyDatabase(run: (client: Client) => Promise<void>) {
  return withTestDatabase(async (client, directory) => {
    const migrationsFolder = prepareMigrationFolder(directory, 3);
    await migrate(drizzle(client), { migrationsFolder });
    await client.executeMultiple(`
      INSERT INTO user (id, email) VALUES ('author', 'author@example.test'), ('other', 'other@example.test');
      INSERT INTO category (id, path) VALUES ('category', 'category');
      INSERT INTO media (id, key, name, size, type, url) VALUES ('cover', 'cover', 'cover', 1, 'image/png', 'https://example.test/cover.png');
      INSERT INTO post (id, author_id, category_id, cover_id, views) VALUES ('legacy', 'author', 'category', 'cover', 7);
      INSERT INTO post_translation (post_id, locale, title, content) VALUES ('legacy', 'zh', '标题', '正文'), ('legacy', 'en', 'Title', 'Content');
      INSERT INTO tag (id) VALUES ('tag');
      INSERT INTO post_tag (post_id, tag_id, type) VALUES ('legacy', 'tag', 'ACTOR');
      INSERT INTO comment (id, author, content, email, post_id) VALUES ('comment', 'Reader', 'Comment', 'reader@example.test', 'legacy');
    `);
    await run(client);
  });
}

describe("post revision migration", () => {
  it("declares the revision and private creation fields on the authoritative table", () => {
    const columns = getTableConfig(post).columns;
    expect(columns.find(({ name }) => name === "version")).toMatchObject({
      notNull: true,
      default: 0,
    });
    expect(columns.find(({ name }) => name === "creation_token")).toMatchObject(
      { notNull: false },
    );
    expect(
      columns.find(({ name }) => name === "creation_input_hash"),
    ).toMatchObject({ notNull: false });
  });

  it("preserves historical rows and foreign keys through the actual migrator", async () => {
    await withLegacyDatabase(async (client) => {
      const tables = [
        "post",
        "post_translation",
        "post_tag",
        "comment",
        "media",
      ];
      const historicalMediaColumns =
        "id, key, name, size, type, url, color, height, width, created_at, updated_at";
      const before = await Promise.all(
        tables.map(
          async (table) =>
            (await client.execute(`SELECT * FROM ${table} ORDER BY 1, 2`)).rows,
        ),
      );
      await migrate(drizzle(client), { migrationsFolder: "drizzle" });
      expect(
        (
          await client.execute(
            "SELECT version, creation_token, creation_input_hash FROM post WHERE id = 'legacy'",
          )
        ).rows,
      ).toEqual([
        { version: 0, creation_token: null, creation_input_hash: null },
      ]);
      expect((await client.execute("SELECT * FROM post")).rows).toEqual([
        {
          ...before[0]?.[0],
          version: 0,
          creation_token: null,
          creation_input_hash: null,
        },
      ]);
      for (const [index, table] of tables.entries()) {
        if (table === "post") continue;
        expect(
          (
            await client.execute(
              `SELECT ${table === "media" ? historicalMediaColumns : "*"} FROM ${table} ORDER BY 1, 2`,
            )
          ).rows,
        ).toEqual(before[index]);
      }
      expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual(
        [],
      );
      expect(
        (await client.execute("PRAGMA foreign_keys")).rows[0]?.foreign_keys,
      ).toBe(1);
      await expect(
        client.execute("UPDATE post SET version = -1 WHERE id = 'legacy'"),
      ).rejects.toThrow(/check constraint/i);
      await expect(
        client.execute("UPDATE post SET version = NULL WHERE id = 'legacy'"),
      ).rejects.toThrow(/not null/i);
      await client.execute(
        "UPDATE post SET version = 1, creation_token = 'token', creation_input_hash = 'hash' WHERE id = 'legacy'",
      );
      await expect(
        client.execute(
          "INSERT INTO post (id, author_id, category_id, creation_token) VALUES ('duplicate', 'author', 'category', 'token')",
        ),
      ).rejects.toThrow(/unique/i);
      await client.execute(
        "INSERT INTO post (id, author_id, category_id, creation_token) VALUES ('other-post', 'other', 'category', 'token')",
      );
      await client.execute(
        "INSERT INTO post (id, author_id, category_id) VALUES ('null-one', 'author', 'category'), ('null-two', 'author', 'category')",
      );
      await expect(
        client.execute(
          "UPDATE post SET author_id = 'missing' WHERE id = 'legacy'",
        ),
      ).rejects.toThrow(/foreign key/i);
      await client.execute("DELETE FROM media WHERE id = 'cover'");
      expect(
        (await client.execute("SELECT cover_id FROM post WHERE id = 'legacy'"))
          .rows[0]?.cover_id,
      ).toBeNull();
      await client.execute("DELETE FROM post WHERE id = 'legacy'");
      for (const table of ["post_translation", "post_tag", "comment"]) {
        expect((await client.execute(`SELECT * FROM ${table}`)).rows).toEqual(
          [],
        );
      }
    });
  });
});
