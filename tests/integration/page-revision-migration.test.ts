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
import { page } from "@/lib/db/schema/content-page";

async function withLegacyDatabase(
  run: (client: Client, migrationsFolder: string) => Promise<void>,
) {
  const directory = mkdtempSync(join(tmpdir(), "honeycomb-page-revision-"));
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
      /^000[0-4]_.*\.sql$/.test(name),
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
        entries: journal.entries.filter(({ idx }) => idx < 5),
      }),
    );
    client = createClient({ url: `file:${join(directory, "migration.db")}` });
    await migrate(drizzle(client), { migrationsFolder });
    await client.executeMultiple(`
      INSERT INTO user (id, email) VALUES ('author', 'author@example.test'), ('other', 'other@example.test');
      INSERT INTO category (id, path) VALUES ('category', 'category');
      INSERT INTO media (id, key, name, size, type, url) VALUES ('cover', 'cover', 'cover', 1, 'image/png', 'https://example.test/cover.png');
      INSERT INTO page (id, author_id, views) VALUES ('legacy', 'author', 7);
      INSERT INTO page_translation (page_id, locale, title, content) VALUES ('legacy', 'zh', '标题', '正文'), ('legacy', 'en', 'Title', 'Content');
      INSERT INTO tag (id) VALUES ('tag');
      INSERT INTO comment (id, author, content, email, page_id) VALUES ('comment', 'Reader', 'Comment', 'reader@example.test', 'legacy');
    `);
    copyFileSync(
      "drizzle/0005_page_editor_revision.sql",
      join(migrationsFolder, "0005_page_editor_revision.sql"),
    );
    writeFileSync(
      join(migrationsFolder, "meta/_journal.json"),
      JSON.stringify({
        ...journal,
        entries: journal.entries.filter(({ idx }) => idx <= 5),
      }),
    );
    await run(client, migrationsFolder);
  } finally {
    cleanup();
    handlers.forEach(({ signal, handler }) =>
      process.removeListener(signal, handler),
    );
    expect(existsSync(directory)).toBe(false);
  }
}

describe("page revision migration", () => {
  it("declares the revision and private creation fields on the authoritative table", () => {
    const columns = getTableConfig(page).columns;
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
    await withLegacyDatabase(async (client, migrationsFolder) => {
      const tables = ["page", "page_translation", "comment", "media"];
      const before = await Promise.all(
        tables.map(
          async (table) =>
            (await client.execute(`SELECT * FROM ${table} ORDER BY 1, 2`)).rows,
        ),
      );
      await migrate(drizzle(client), { migrationsFolder });
      expect(
        (
          await client.execute(
            "SELECT version, creation_token, creation_input_hash FROM page WHERE id = 'legacy'",
          )
        ).rows,
      ).toEqual([
        { version: 0, creation_token: null, creation_input_hash: null },
      ]);
      expect((await client.execute("SELECT * FROM page")).rows).toEqual([
        {
          ...before[0]?.[0],
          version: 0,
          creation_token: null,
          creation_input_hash: null,
        },
      ]);
      for (const [index, table] of tables.entries()) {
        if (table === "page") continue;
        expect(
          (await client.execute(`SELECT * FROM ${table} ORDER BY 1, 2`)).rows,
        ).toEqual(before[index]);
      }
      expect((await client.execute("PRAGMA foreign_key_check")).rows).toEqual(
        [],
      );
      expect(
        (await client.execute("PRAGMA foreign_keys")).rows[0]?.foreign_keys,
      ).toBe(1);
      await expect(
        client.execute("UPDATE page SET version = -1 WHERE id = 'legacy'"),
      ).rejects.toThrow(/check constraint/i);
      await expect(
        client.execute("UPDATE page SET version = NULL WHERE id = 'legacy'"),
      ).rejects.toThrow(/not null/i);
      await client.execute(
        "UPDATE page SET version = 1, creation_token = 'token', creation_input_hash = 'hash' WHERE id = 'legacy'",
      );
      await expect(
        client.execute(
          "INSERT INTO page (id, author_id, creation_token) VALUES ('duplicate', 'author', 'token')",
        ),
      ).rejects.toThrow(/unique/i);
      await client.execute(
        "INSERT INTO page (id, author_id, creation_token) VALUES ('other-page', 'other', 'token')",
      );
      await client.execute(
        "INSERT INTO page (id, author_id) VALUES ('null-one', 'author'), ('null-two', 'author')",
      );
      await expect(
        client.execute(
          "UPDATE page SET author_id = 'missing' WHERE id = 'legacy'",
        ),
      ).rejects.toThrow(/foreign key/i);
      await client.execute("DELETE FROM page WHERE id = 'legacy'");
      for (const table of ["page_translation", "comment"]) {
        expect((await client.execute(`SELECT * FROM ${table}`)).rows).toEqual(
          [],
        );
      }
    });
  });
});
