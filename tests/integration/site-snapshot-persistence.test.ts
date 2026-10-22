// @vitest-environment node
import { createClient } from "@libsql/client/node";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { eq } from "drizzle-orm";
import { existsSync, lstatSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import * as schema from "@/lib/db/schema";
import type { Database } from "@/lib/db/db";
import { MenuType } from "@/features/menu/types/menu.type";
import {
  getMenuSnapshot,
  listMenus,
} from "@/features/menu/server/menu-queries";
import { saveAllMenus } from "@/features/menu/server/menu-commands";
import { getSetting } from "@/features/setting/server/setting-queries";
import { updateSetting } from "@/features/setting/server/setting-update";
import { destroyCategories } from "@/features/category/server/category-commands";
import { destroyPages } from "@/features/page/server/page-commands";
vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (_name: string, _kind: string, op: () => unknown) => op(),
}));
const actor = "111111111111111111111111";
const category = "222222222222222222222222";
const page = "333333333333333333333333";
const setting = "444444444444444444444444";
const cache = () => ({
  invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
});

describe("site snapshot transactions on isolated SQLite", () => {
  let directory: string | undefined;
  let client: ReturnType<typeof createClient> | undefined;
  let db: Database;
  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), "honeycomb-site-snapshot-"));
    const info = lstatSync(directory);
    expect(info.isSymbolicLink()).toBe(false);
    if (process.getuid) expect(info.uid).toBe(process.getuid());
    client = createClient({ url: `file:${join(directory, "site.db")}` });
    db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values({
      id: actor,
      name: "Admin",
      email: "site-admin@example.test",
      emailVerified: true,
      level: UserLevel.ADMIN,
      status: UserStatus.ENABLE,
    });
    await db.insert(schema.setting).values({ id: setting });
    await db
      .insert(schema.category)
      .values({ id: category, path: "hidden", status: "DISABLE" });
    await db.insert(schema.page).values({
      id: page,
      authorId: actor,
      status: "DRAFT",
      template: "default",
    });
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
  it("migrates and seeds the empty menu revision then keeps hidden targets out of public reads", async () => {
    expect(await getMenuSnapshot(db)).toEqual({
      list: [],
      total: 0,
      version: 0,
    });
    const result = await saveAllMenus(
      db,
      {
        expectedVersion: 0,
        items: [
          { id: category, type: MenuType.CATEGORY, power: 0 },
          { id: page, type: MenuType.PAGE, power: 1 },
        ],
      },
      actor,
      cache(),
    );
    expect(result).toMatchObject({ count: 2, version: 1 });
    expect((await getMenuSnapshot(db)).list).toHaveLength(2);
    expect((await listMenus(db, "PUBLIC_ONLY")).list).toEqual([]);
  });
  it("rolls back revision and tree on invalid target or insert failure", async () => {
    await saveAllMenus(
      db,
      {
        expectedVersion: 0,
        items: [{ id: page, type: MenuType.PAGE, power: 0 }],
      },
      actor,
      cache(),
    );
    await expect(
      saveAllMenus(
        db,
        {
          expectedVersion: 1,
          items: [
            { id: "999999999999999999999999", type: MenuType.PAGE, power: 0 },
          ],
        },
        actor,
        cache(),
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    if (!client) throw new Error("missing client");
    await client.execute(
      "CREATE TRIGGER fail_menu_insert BEFORE INSERT ON menu BEGIN SELECT RAISE(ABORT, 'injected'); END",
    );
    await expect(
      saveAllMenus(
        db,
        {
          expectedVersion: 1,
          items: [{ id: page, type: MenuType.PAGE, power: 1 }],
        },
        actor,
        cache(),
      ),
    ).rejects.toThrow();
    const snapshot = await getMenuSnapshot(db);
    expect(snapshot.version).toBe(1);
    expect(snapshot.list.map((row) => row.id)).toEqual([page]);
  });
  it("rejects stale settings and rolls back parent version when translations fail", async () => {
    await updateSetting(
      db,
      { id: setting, expectedVersion: 0, siteName: { zh: "先保存" } },
      actor,
      cache(),
    );
    await expect(
      updateSetting(
        db,
        { id: setting, expectedVersion: 0, siteName: { zh: "旧" } },
        actor,
        cache(),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    if (!client) throw new Error("missing client");
    await client.execute(
      "CREATE TRIGGER fail_setting_translation BEFORE INSERT ON setting_translation BEGIN SELECT RAISE(ABORT, 'injected'); END",
    );
    await expect(
      updateSetting(
        db,
        {
          id: setting,
          expectedVersion: 1,
          siteRecordNo: "new",
          siteName: { zh: "失败" },
        },
        actor,
        cache(),
      ),
    ).rejects.toThrow();
    expect(await getSetting(db)).toMatchObject({
      version: 1,
      siteName: { zh: "先保存" },
      siteRecordNo: null,
    });
  });
  it("rejects disabled actors without changing either snapshot", async () => {
    await db
      .update(schema.user)
      .set({ status: UserStatus.DISABLE })
      .where(eq(schema.user.id, actor));
    await expect(
      saveAllMenus(
        db,
        {
          expectedVersion: 0,
          items: [{ id: page, type: MenuType.PAGE, power: 0 }],
        },
        actor,
        cache(),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(
      updateSetting(
        db,
        { id: setting, expectedVersion: 0, siteName: { zh: "越权" } },
        actor,
        cache(),
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect((await getMenuSnapshot(db)).version).toBe(0);
    expect((await getSetting(db))?.version).toBe(0);
  });
  it("bumps menu revision for category nulling and page cascade in the deletion transaction", async () => {
    await saveAllMenus(
      db,
      {
        expectedVersion: 0,
        items: [
          { id: category, type: MenuType.CATEGORY, power: 0 },
          { id: page, type: MenuType.PAGE, power: 1 },
        ],
      },
      actor,
      cache(),
    );
    await destroyCategories(db, [category], cache());
    expect((await getMenuSnapshot(db)).version).toBe(2);
    expect(
      (await db.select().from(schema.menu)).find(
        (row) => row.type === "CATEGORY",
      )?.categoryId,
    ).toBeNull();
    await destroyPages(
      db,
      { items: [{ id: page, expectedVersion: 0 }] },
      actor,
      cache(),
    );
    expect((await getMenuSnapshot(db)).version).toBe(3);
    await expect(
      saveAllMenus(
        db,
        {
          expectedVersion: 1,
          items: [{ id: page, type: MenuType.PAGE, power: 0 }],
        },
        actor,
        cache(),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("rolls back menu revision if target deletion fails or page version conflicts", async () => {
    await saveAllMenus(
      db,
      {
        expectedVersion: 0,
        items: [
          { id: category, type: MenuType.CATEGORY, power: 0 },
          { id: page, type: MenuType.PAGE, power: 1 },
        ],
      },
      actor,
      cache(),
    );
    if (!client) throw new Error("missing client");
    await client.execute(
      "CREATE TRIGGER fail_category_delete BEFORE DELETE ON category BEGIN SELECT RAISE(ABORT, 'injected'); END",
    );
    await expect(destroyCategories(db, [category], cache())).rejects.toThrow();
    expect((await getMenuSnapshot(db)).version).toBe(1);
    await expect(
      destroyPages(
        db,
        { items: [{ id: page, expectedVersion: 99 }] },
        actor,
        cache(),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const snapshot = await getMenuSnapshot(db);
    expect(snapshot.version).toBe(1);
    expect(snapshot.list.map((row) => row.id)).toEqual([category, page]);
  });
  it("does not bump menu version for an unrelated category deletion", async () => {
    await destroyCategories(db, [category], cache());
    expect((await getMenuSnapshot(db)).version).toBe(0);
  });

  it("admits at most one concurrent menu and settings save from the same revision", async () => {
    const menus = await Promise.allSettled(
      [0, 1].map((power) =>
        saveAllMenus(
          db,
          {
            expectedVersion: 0,
            items: [{ id: page, type: MenuType.PAGE, power }],
          },
          actor,
          cache(),
        ),
      ),
    );
    expect(
      menus.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(menus.find((result) => result.status === "rejected")).toMatchObject({
      reason: { code: "CONFLICT" },
    });
    const settings = await Promise.allSettled(
      ["one", "two"].map((siteRecordNo) =>
        updateSetting(
          db,
          { id: setting, expectedVersion: 0, siteRecordNo },
          actor,
          cache(),
        ),
      ),
    );
    expect(
      settings.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      settings.find((result) => result.status === "rejected"),
    ).toMatchObject({ reason: { code: "CONFLICT" } });
  });
});
