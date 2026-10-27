// @vitest-environment node
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { existsSync, lstatSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { MultiLangEnum } from "@/lib/i18n/i18n";
import type { Database } from "@/lib/db/db";
import {
  listPages,
  listPageSummaries,
  listPageMenuOptions,
} from "@/features/page/server/page-queries";
import { PageStatus } from "@/features/page/types/page.status";
vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
let directory: string | undefined;
let client: ReturnType<typeof createClient> | undefined;
let db: Database;
let statements: string[];
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "honeycomb-page-read-model-"));
  const info = lstatSync(directory);
  expect(info.isSymbolicLink()).toBe(false);
  if (process.getuid) expect(info.uid).toBe(process.getuid());
  client = createClient({ url: `file:${join(directory, "test.db")}` });
  statements = [];
  db = drizzle(client, {
    schema,
    logger: {
      logQuery(query) {
        statements.push(query);
      },
    },
  });
  await client.executeMultiple(`
    CREATE TABLE user (id TEXT PRIMARY KEY, name TEXT);
    CREATE TABLE page (id TEXT PRIMARY KEY, author_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'DRAFT', template TEXT NOT NULL DEFAULT 'default', version INTEGER NOT NULL DEFAULT 0, creation_token TEXT, creation_input_hash TEXT, views INTEGER NOT NULL DEFAULT 0, created_at TEXT, updated_at TEXT);
    CREATE TABLE page_translation (page_id TEXT, locale TEXT, title TEXT, content TEXT);
    CREATE TABLE media (id TEXT PRIMARY KEY, key TEXT, name TEXT, size INTEGER, type TEXT, url TEXT, color TEXT, height INTEGER, width INTEGER, created_at TEXT, updated_at TEXT);
    INSERT INTO user VALUES ('author', 'Author');
  `);
  await db.insert(schema.page).values(
    Array.from({ length: 101 }, (_, index) => ({
      id: `page-${index}`,
      authorId: "author",
      status: index % 2 ? PageStatus.DRAFT : PageStatus.PUBLISHED,
      creationToken: `private-token-${index}`,
      creationInputHash: "private-hash",
      version: 7,
    })),
  );
  await db.insert(schema.pageTranslation).values(
    Array.from({ length: 101 }, (_, index) => [
      {
        pageId: `page-${index}`,
        locale: MultiLangEnum.En,
        title: `Page ${index}`,
        content: `${"a".repeat(16000)}<img src="https://cdn.test/cover.png">`,
      },
      {
        pageId: `page-${index}`,
        locale: MultiLangEnum.Zh,
        title: `页面 ${index}`,
        content: "文".repeat(16000),
      },
    ]).flat(),
  );
  statements = [];
});
afterEach(() => {
  client?.close();
  client = undefined;
  if (directory) {
    rmSync(directory, { recursive: true, force: true });
    expect(existsSync(directory)).toBe(false);
    directory = undefined;
  }
});
it("measures the same 101-page fixture without selecting or serializing bodies for admin choices", async () => {
  const full = await listPages(db, { limit: 101 }, "ALL");
  const fullStatements = statements.length;
  statements = [];
  const summaries = await listPageSummaries(db, { limit: 101 }, "ALL");
  const summaryStatements = statements.length;
  expect(
    statements.some(
      (sql) => sql.includes('"content"') || sql.includes('"media"'),
    ),
  ).toBe(false);
  statements = [];
  const first = await listPageMenuOptions(db, { page: 1, limit: 100 }, "ALL");
  const second = await listPageMenuOptions(db, { page: 2, limit: 100 }, "ALL");
  const options = { list: [...first.list, ...second.list], total: first.total };
  expect(options.list).toHaveLength(101);
  expect(new Set(options.list.map(({ id }) => id)).size).toBe(101);
  expect(
    statements.some(
      (sql) =>
        sql.includes('"content"') ||
        sql.includes('"media"') ||
        sql.includes('"user"'),
    ),
  ).toBe(false);
  expect(Object.keys(summaries.list[0] ?? {}).sort()).toEqual([
    "author",
    "createdAt",
    "id",
    "status",
    "template",
    "title",
    "updatedAt",
    "version",
    "views",
  ]);
  expect(Object.keys(options.list[0] ?? {}).sort()).toEqual([
    "createdAt",
    "id",
    "title",
    "updatedAt",
  ]);
  expect(summaries.list.every(({ version }) => version === 7)).toBe(true);
  process.stdout.write(
    "CONTENT-014 fixture " +
      JSON.stringify({
        pages: 101,
        fullQueries: fullStatements,
        summaryQueries: summaryStatements,
        menuQueriesForTwoPages: statements.length,
        fullBytes: Buffer.byteLength(JSON.stringify(full)),
        summaryBytes: Buffer.byteLength(JSON.stringify(summaries)),
        menuBytes: Buffer.byteLength(JSON.stringify(options)),
      }) +
      "\n",
  );
});
it("filters guest menu options and summaries using the same publication visibility", async () => {
  const menu = await listPageMenuOptions(
    db,
    { limit: 100, status: [PageStatus.DRAFT] },
    "PUBLISHED_ONLY",
  );
  expect(menu).toEqual({ list: [], total: 0 });
  const visible = await listPageMenuOptions(
    db,
    { limit: 100 },
    "PUBLISHED_ONLY",
  );
  expect(visible.total).toBe(51);
  const summaries = await listPageSummaries(
    db,
    { limit: 100 },
    "PUBLISHED_ONLY",
  );
  expect(summaries.total).toBe(51);
  expect(
    summaries.list.every(({ status }) => status === PageStatus.PUBLISHED),
  ).toBe(true);
});

it("searches translated title and content in narrow relational reads without aliasing translation columns to page", async () => {
  const input = { title: "Page 100", content: "aaa" };
  const full = await listPages(db, input, "PUBLISHED_ONLY");
  const summary = await listPageSummaries(db, input, "PUBLISHED_ONLY");
  const menu = await listPageMenuOptions(db, input, "PUBLISHED_ONLY");
  expect(full.list.map(({ id }) => id)).toEqual(["page-100"]);
  expect(summary.list.map(({ id }) => id)).toEqual(["page-100"]);
  expect(menu.list.map(({ id }) => id)).toEqual(["page-100"]);
  expect(summary.total).toBe(1);
  expect(menu.total).toBe(1);
});
