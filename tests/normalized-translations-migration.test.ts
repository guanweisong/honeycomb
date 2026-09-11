import { createClient, type Client } from "@libsql/client/node";
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
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const legacyMultilingualColumns = {
  category: ["description", "title"],
  post: [
    "gallery_location",
    "content",
    "excerpt",
    "title",
    "quote_author",
    "quote_content",
  ],
  page: ["content", "title"],
  setting: ["site_name", "site_sub_name", "site_signature", "site_copyright"],
  tag: ["name"],
} as const;

function migrationSql(index: string): string {
  const file = readdirSync("drizzle").find(
    (name) => name.startsWith(`${index}_`) && name.endsWith(".sql"),
  );
  expect(file, `migration ${index} must exist`).toBeDefined();
  return readFileSync(join("drizzle", file ?? "missing.sql"), "utf8");
}

async function columns(client: Client, table: string): Promise<string[]> {
  const result = await client.execute(`pragma table_info(${table})`);
  return result.rows.map((row) => String(row.name));
}

async function count(client: Client, table: string): Promise<number> {
  const result = await client.execute(`select count(*) as count from ${table}`);
  return Number(result.rows[0]?.count ?? 0);
}

async function seedValidLegacyData(client: Client) {
  const complete = JSON.stringify({ en: "English", zh: "中文" });
  await client.execute({
    sql: "insert into user (id, email) values (?, ?)",
    args: ["author", "author@example.com"],
  });
  await client.execute({
    sql: "insert into category (id, description, title, path) values (?, ?, ?, ?)",
    args: ["category", complete, complete, "category"],
  });
  await client.execute({
    sql: "insert into page (id, author_id, content, title) values (?, ?, ?, ?)",
    args: ["page", "author", complete, complete],
  });
  await client.execute({
    sql: "insert into post (id, author_id, category_id, title, content, excerpt) values (?, ?, ?, ?, ?, ?)",
    args: [
      "post",
      "author",
      "category",
      complete,
      JSON.stringify({ zh: "正文" }),
      JSON.stringify({ en: "Excerpt" }),
    ],
  });
  await client.execute({
    sql: "insert into setting (id, site_name, site_sub_name, site_signature, site_copyright) values (?, ?, ?, ?, ?)",
    args: [
      "setting",
      JSON.stringify({ zh: "站点" }),
      complete,
      complete,
      complete,
    ],
  });
  await client.execute({
    sql: "insert into tag (id, name) values (?, ?)",
    args: ["tag", complete],
  });
}

describe("normalized translation migration", () => {
  let directory: string;
  let client: Client;

  beforeEach(async () => {
    directory = mkdtempSync(
      join(tmpdir(), `honeycomb-translation-${process.getuid?.() ?? "user"}-`),
    );
    const stat = lstatSync(directory);
    expect(stat.isSymbolicLink()).toBe(false);
    if (typeof process.getuid === "function")
      expect(stat.uid).toBe(process.getuid());
    client = createClient({ url: `file:${join(directory, "migration.db")}` });
    await client.execute("pragma foreign_keys = on");
    await client.executeMultiple(migrationSql("0000"));
    await client.executeMultiple(migrationSql("0001"));
  });

  afterEach(() => {
    client.close();
    rmSync(directory, { recursive: true });
    expect(existsSync(directory)).toBe(false);
  });

  it("uses guard statements accepted by the Turso remote protocol", () => {
    const sql = `${migrationSql("0001")}\n${migrationSql("0002")}`;

    expect(sql).not.toMatch(/\bTEMP\b/i);
    expect(sql).not.toMatch(/\bTRIGGER\b/i);
  });

  it("backfills exact localized values and removes legacy columns", async () => {
    await seedValidLegacyData(client);
    const before = Object.fromEntries(
      await Promise.all(
        Object.keys(legacyMultilingualColumns).map(async (table) => [
          table,
          await count(client, table),
        ]),
      ),
    );

    await client.executeMultiple(migrationSql("0002"));

    for (const [table, removedColumns] of Object.entries(
      legacyMultilingualColumns,
    )) {
      expect(await count(client, table)).toBe(before[table]);
      expect(await columns(client, table)).not.toEqual(
        expect.arrayContaining([...removedColumns]),
      );
    }
    expect(await count(client, "category_translation")).toBe(2);
    expect(await count(client, "page_translation")).toBe(2);
    expect(await count(client, "tag_translation")).toBe(2);
    expect(
      await client.execute(
        "select locale, content, excerpt from post_translation order by locale",
      ),
    ).toMatchObject({
      rows: [
        { locale: "en", content: null, excerpt: "Excerpt" },
        { locale: "zh", content: "正文", excerpt: null },
      ],
    });
    expect(
      await client.execute(
        "select locale, site_name from setting_translation order by locale",
      ),
    ).toMatchObject({
      rows: [
        { locale: "en", site_name: null },
        { locale: "zh", site_name: "站点" },
      ],
    });
  });

  it.each([
    [
      "category",
      "insert into category (id, description, title, path) values ('bad', '{\"zh\":\"描述\"}', '{\"zh\":\"标题\"}', 'bad')",
    ],
    [
      "page",
      "insert into page (id, author_id, content, title) values ('bad', 'author', '{invalid', '{\"en\":\"Title\",\"zh\":\"标题\"}')",
    ],
    ["tag", "insert into tag (id, name) values ('bad', '{\"en\":\"Tag\"}')"],
  ])(
    "rejects invalid required %s translations before dropping old columns",
    async (table, insertSql) => {
      await client.execute({
        sql: "insert into user (id, email) values (?, ?)",
        args: ["author", "author@example.com"],
      });
      await client.execute(insertSql);

      await expect(
        client.executeMultiple(migrationSql("0002")),
      ).rejects.toThrow(new RegExp(`${table} translations`, "i"));
      expect(await columns(client, table)).toEqual(
        expect.arrayContaining([
          ...legacyMultilingualColumns[
            table as keyof typeof legacyMultilingualColumns
          ],
        ]),
      );
    },
  );

  it.each([
    [
      "post",
      "insert into post (id, author_id, category_id, title) values ('bad', 'author', 'category', '{invalid')",
    ],
    [
      "setting",
      `insert into setting (id, site_name, site_sub_name, site_signature, site_copyright)
       values ('bad', '{invalid', '{"en":"Sub"}', '{"en":"Signature"}', '{"en":"Copyright"}')`,
    ],
  ])(
    "rejects invalid optional %s JSON with a diagnostic guard",
    async (table, insertSql) => {
      const complete = JSON.stringify({ en: "English", zh: "中文" });
      await client.execute({
        sql: "insert into user (id, email) values (?, ?)",
        args: ["author", "author@example.com"],
      });
      await client.execute({
        sql: "insert into category (id, description, title, path) values (?, ?, ?, ?)",
        args: ["category", complete, complete, "category"],
      });
      await client.execute(insertSql);

      await expect(
        client.executeMultiple(migrationSql("0002")),
      ).rejects.toThrow(new RegExp(`${table} translations`, "i"));
    },
  );

  it("enforces locale checks and cascade deletion after migration", async () => {
    await seedValidLegacyData(client);
    await client.executeMultiple(migrationSql("0002"));

    await expect(
      client.execute(
        "insert into tag_translation (tag_id, locale, name) values ('tag', 'fr', 'Tag')",
      ),
    ).rejects.toThrow(/check constraint/i);
    await client.execute("delete from tag where id = 'tag'");
    expect(await count(client, "tag_translation")).toBe(0);
  });
});
