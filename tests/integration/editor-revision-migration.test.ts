// @vitest-environment node
import {
  prepareMigrationFolder,
  withTestDatabase,
} from "@tests/helpers/local-test-database";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { post } from "@/lib/db/schema/post";
import { page } from "@/lib/db/schema/page";

const emptyReceipt = {
  version: 0,
  creation_token: null,
  creation_input_hash: null,
};

describe.each([
  { entity: "post", table: post, legacyIndex: 3 },
  { entity: "page", table: page, legacyIndex: 4 },
] as const)("$entity revision migration", ({ entity, table, legacyIndex }) => {
  const isPost = entity === "post";
  const translation = `${entity}_translation`;
  const entityIdColumn = `${entity}_id`;
  const extraColumn = isPost ? ", category_id" : "";
  const extraValue = isPost ? ", 'category'" : "";

  it("declares the revision and private creation fields on the authoritative table", () => {
    const columns = getTableConfig(table).columns;
    expect(columns.find(({ name }) => name === "version")).toMatchObject({
      notNull: true,
      default: 0,
    });
    for (const field of ["creation_token", "creation_input_hash"]) {
      expect(columns.find(({ name }) => name === field)).toMatchObject({
        notNull: false,
      });
    }
  });

  it("preserves historical rows and foreign keys through the actual migrator", async () => {
    await withTestDatabase(async (client, directory) => {
      const baseline = prepareMigrationFolder(directory, legacyIndex);
      const db = drizzle(client);
      await migrate(db, { migrationsFolder: baseline });
      await client.executeMultiple(`
        INSERT INTO user (id, email) VALUES ('author', 'author@example.test'), ('other', 'other@example.test');
        INSERT INTO category (id, path) VALUES ('category', 'category');
        INSERT INTO media (id, key, name, size, type, url) VALUES ('cover', 'cover', 'cover', 1, 'image/png', 'https://example.test/cover.png');
        INSERT INTO ${entity} (id, author_id, views${extraColumn}${isPost ? ", cover_id" : ""}) VALUES ('legacy', 'author', 7${extraValue}${isPost ? ", 'cover'" : ""});
        INSERT INTO ${translation} (${entityIdColumn}, locale, title, content) VALUES ('legacy', 'zh', '标题', '正文'), ('legacy', 'en', 'Title', 'Content');
        INSERT INTO tag (id) VALUES ('tag');
        ${isPost ? "INSERT INTO post_tag (post_id, tag_id, type) VALUES ('legacy', 'tag', 'ACTOR');" : ""}
        INSERT INTO comment (id, author, content, email, ${entityIdColumn}) VALUES ('comment', 'Reader', 'Comment', 'reader@example.test', 'legacy');
      `);

      const cascades = [
        translation,
        "comment",
        ...(isPost ? ["post_tag"] : []),
      ];
      const historicalMediaColumns =
        "id, key, name, size, type, url, color, height, width, created_at, updated_at";
      const tables = [entity, ...cascades, "media"];
      const snapshot = async () =>
        Promise.all(
          tables.map(async (name) => {
            const fields =
              name === "media" && isPost ? historicalMediaColumns : "*";
            return (
              await client.execute(
                `SELECT ${fields} FROM ${name} ORDER BY 1, 2`,
              )
            ).rows;
          }),
        );
      const [beforeEntity, ...beforeRelated] = await snapshot();

      // Exercise the exact Page revision boundary and the full Post upgrade.
      await migrate(db, {
        migrationsFolder: isPost
          ? "drizzle"
          : prepareMigrationFolder(directory, 5),
      });

      const [afterEntity, ...afterRelated] = await snapshot();
      expect(afterEntity).toEqual([{ ...beforeEntity?.[0], ...emptyReceipt }]);
      expect(afterRelated).toEqual(beforeRelated);
      expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual(
        [],
      );
      expect(
        (await client.execute("PRAGMA foreign_keys")).rows[0]?.foreign_keys,
      ).toBe(1);
      await expect(
        client.execute(`UPDATE ${entity} SET version = -1 WHERE id = 'legacy'`),
      ).rejects.toThrow(/check constraint/i);
      await expect(
        client.execute(
          `UPDATE ${entity} SET version = NULL WHERE id = 'legacy'`,
        ),
      ).rejects.toThrow(/not null/i);
      await client.execute(
        `UPDATE ${entity} SET version = 1, creation_token = 'token', creation_input_hash = 'hash' WHERE id = 'legacy'`,
      );
      const insertWithToken = (id: string, author: string) =>
        client.execute({
          sql: `INSERT INTO ${entity} (id, author_id, creation_token${extraColumn}) VALUES (?, ?, 'token'${extraValue})`,
          args: [id, author],
        });
      await expect(insertWithToken("duplicate", "author")).rejects.toThrow(
        /unique/i,
      );
      await insertWithToken("other-record", "other");
      await client.execute(
        `INSERT INTO ${entity} (id, author_id${extraColumn}) VALUES ('null-one', 'author'${extraValue}), ('null-two', 'author'${extraValue})`,
      );
      await expect(
        client.execute(
          `UPDATE ${entity} SET author_id = 'missing' WHERE id = 'legacy'`,
        ),
      ).rejects.toThrow(/foreign key/i);

      if (isPost) {
        await client.execute("DELETE FROM media WHERE id = 'cover'");
        expect(
          (
            await client.execute(
              "SELECT cover_id FROM post WHERE id = 'legacy'",
            )
          ).rows[0]?.cover_id,
        ).toBeNull();
      }
      await client.execute(`DELETE FROM ${entity} WHERE id = 'legacy'`);
      for (const name of cascades) {
        expect((await client.execute(`SELECT * FROM ${name}`)).rows).toEqual(
          [],
        );
      }
    });
  });
});
