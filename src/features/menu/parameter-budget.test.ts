// @vitest-environment node
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { existsSync, lstatSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { MultiLangEnum } from "@/lib/i18n/i18n";
import { saveAllMenus } from "@/features/menu/server/menu-commands";
import { listMenus } from "@/features/menu/server/menu-queries";
import { MenuType } from "@/features/menu/types/menu.type";
import { getCategoryTree } from "@/features/category/server/category-queries";
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
let bindings: number[];
const actor = "actor".padEnd(24, "0");
const cache = { invalidate: vi.fn().mockResolvedValue({ state: "completed" }) };
beforeEach(async () => {
  directory = mkdtempSync(join(tmpdir(), "honeycomb-content-budget-"));
  const info = lstatSync(directory);
  expect(info.isSymbolicLink()).toBe(false);
  if (process.getuid) expect(info.uid).toBe(process.getuid());
  client = createClient({ url: `file:${join(directory, "test.db")}` });
  bindings = [];
  db = drizzle(client, {
    schema,
    logger: {
      logQuery(_query, params) {
        bindings.push(params.length);
      },
    },
  });
  // Minimal disposable fixture only. No migration runner, app environment or remote database.
  await client.executeMultiple(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE user (id TEXT PRIMARY KEY, level TEXT NOT NULL, status TEXT NOT NULL);
    CREATE TABLE menu_revision (singleton_key INTEGER PRIMARY KEY, version INTEGER NOT NULL);
    CREATE TABLE menu (id TEXT PRIMARY KEY, parent TEXT REFERENCES menu(id), category_id TEXT, page_id TEXT, custom_id TEXT, power INTEGER NOT NULL, type TEXT NOT NULL, created_at TEXT, updated_at TEXT);
    CREATE TABLE category (id TEXT PRIMARY KEY, parent TEXT, status TEXT NOT NULL, path TEXT NOT NULL, created_at TEXT, updated_at TEXT);
    CREATE TABLE category_translation (category_id TEXT, locale TEXT, title TEXT, description TEXT);
    INSERT INTO user VALUES ('${actor}', 'ADMIN', 'ENABLE');
    INSERT INTO menu_revision VALUES (1, 0);
  `);
  cache.invalidate.mockClear();
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
const item = (index: number) => ({
  id: index.toString().padStart(24, "0"),
  type: MenuType.CUSTOM,
  power: index,
});
it("persists a tree exceeding one local SQL statement budget and keeps forward parent references", async () => {
  const items = Array.from({ length: 4000 }, (_, index) => item(index));
  const parent = items.at(-1);
  if (!parent) throw new Error("Missing parent");
  const withParent = items.map((entry, index) =>
    index === 0 ? { ...entry, parent: parent.id } : entry,
  );
  const result = await saveAllMenus(
    db,
    { expectedVersion: 0, items: withParent },
    actor,
    cache,
  );
  expect(result).toMatchObject({ count: 4000, version: 1 });
  const rows = await listMenus(db, "ALL");
  expect(rows.list).toHaveLength(4000);
  expect(rows.list[0]).toMatchObject({
    id: item(0).id,
    parent: parent.id,
    power: 0,
  });
  expect(Math.max(...bindings)).toBeLessThanOrEqual(500);
  expect(cache.invalidate).toHaveBeenCalledOnce();
}, 30_000);
it("rolls back all earlier chunks and the CAS version when a later insert fails", async () => {
  const items = Array.from({ length: 1101 }, (_, index) => item(index));
  const connection = client;
  if (!connection) throw new Error("Missing local client");
  await connection.execute(
    "CREATE TRIGGER fail_later_menu BEFORE INSERT ON menu WHEN NEW.power = 700 BEGIN SELECT RAISE(ABORT, 'injected later chunk'); END",
  );
  await expect(
    saveAllMenus(db, { expectedVersion: 0, items }, actor, cache),
  ).rejects.toThrow();
  expect(
    (await connection.execute("SELECT version FROM menu_revision")).rows,
  ).toEqual([{ version: 0 }]);
  expect(
    (await connection.execute("SELECT count(*) AS count FROM menu")).rows,
  ).toEqual([{ count: 0 }]);
  expect(cache.invalidate).not.toHaveBeenCalled();
});
it("reads every category translation and menu target using bounded ID queries", async () => {
  const items = Array.from({ length: 1101 }, (_, index) => ({
    id: index.toString().padStart(24, "0"),
    type: MenuType.CATEGORY,
    power: index,
  }));
  for (let offset = 0; offset < items.length; offset += 100) {
    const batch = items.slice(offset, offset + 100);
    await db
      .insert(schema.category)
      .values(batch.map(({ id }) => ({ id, path: id, status: "ENABLE" })));
    await db.insert(schema.categoryTranslation).values(
      batch.flatMap(({ id }) => [
        {
          categoryId: id,
          locale: MultiLangEnum.En,
          title: "Category",
          description: "",
        },
        {
          categoryId: id,
          locale: MultiLangEnum.Zh,
          title: "分类",
          description: "",
        },
      ]),
    );
  }
  bindings = [];
  expect((await getCategoryTree(db, "ALL")).list).toHaveLength(1101);
  expect(Math.max(...bindings)).toBeLessThanOrEqual(500);
  await saveAllMenus(db, { expectedVersion: 0, items }, actor, cache);
  bindings = [];
  expect((await listMenus(db, "ALL")).list).toHaveLength(1101);
  expect(Math.max(...bindings)).toBeLessThanOrEqual(500);
}, 30_000);
