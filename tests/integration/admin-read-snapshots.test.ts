// @vitest-environment node
import type { Client, InStatement } from "@libsql/client/node";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { categoryRouter } from "@/features/category/router";
import { menuRouter } from "@/features/menu/router";
import {
  getMenuSnapshot,
  listMenus,
} from "@/features/menu/server/menu-queries";
import { MenuType } from "@/features/menu/types/menu.type";
import { pageRouter } from "@/features/page/router";
import { settingRouter } from "@/features/setting/router";
import { getSetting } from "@/features/setting/server/setting-queries";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import type { Database } from "@/lib/db/db";
import * as schema from "@/lib/db/schema";
import { MultiLangEnum } from "@/lib/i18n/i18n";
import { configureObservability } from "@/lib/observability/server/registry";
import { createTRPCRouter } from "@/lib/trpc/core";
import { withTestDatabase } from "@tests/helpers/local-test-database";
import { createMemoryObservability } from "@tests/helpers/memory-observability";

const actor = "111111111111111111111111";
const category = "222222222222222222222222";
const page = "333333333333333333333333";
const setting = "444444444444444444444444";
const stamp = "2026-01-01T00:00:00.000Z";
const router = createTRPCRouter({
  setting: settingRouter,
  page: pageRouter,
  category: categoryRouter,
  menu: menuRouter,
});

async function withSnapshots(
  run: (db: Database, client: Client) => Promise<void>,
) {
  await withTestDatabase(async (client) => {
    const db = drizzle(client, { schema });
    await migrate(db, { migrationsFolder: "drizzle" });
    await db.insert(schema.user).values({
      id: actor,
      name: "Admin",
      email: "snapshot@example.test",
      emailVerified: true,
      level: UserLevel.ADMIN,
      status: UserStatus.ENABLE,
    });
    await db.insert(schema.setting).values({
      id: setting,
      version: 7,
      createdAt: stamp,
      updatedAt: stamp,
    });
    await db.insert(schema.settingTranslation).values([
      { settingId: setting, locale: MultiLangEnum.En, siteName: "Site" },
      { settingId: setting, locale: MultiLangEnum.Zh, siteName: "站点" },
    ]);
    await db.insert(schema.category).values({
      id: category,
      path: "hidden",
      status: "DISABLE",
    });
    await db.insert(schema.categoryTranslation).values([
      {
        categoryId: category,
        locale: MultiLangEnum.En,
        title: "Category",
        description: "",
      },
      {
        categoryId: category,
        locale: MultiLangEnum.Zh,
        title: "分类",
        description: "",
      },
    ]);
    await db.insert(schema.page).values({
      id: page,
      authorId: actor,
      status: "DRAFT",
      template: "default",
    });
    await db.insert(schema.pageTranslation).values([
      { pageId: page, locale: MultiLangEnum.En, title: "Page", content: "" },
      { pageId: page, locale: MultiLangEnum.Zh, title: "页面", content: "" },
    ]);
    await db.insert(schema.menu).values(
      [
        { id: "page-row", type: MenuType.PAGE, pageId: page, power: 2 },
        {
          id: "category-row",
          type: MenuType.CATEGORY,
          categoryId: category,
          power: 1,
        },
        {
          id: "custom-row",
          type: MenuType.CUSTOM,
          customId: "custom-business-id",
          parent: "category-row",
          power: 3,
        },
      ].map((row) => ({ ...row, createdAt: stamp, updatedAt: stamp })),
    );
    await db.update(schema.menuRevision).set({ version: 7 });
    await run(db, client);
  });
}

function menuRequest(db: Database) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    router,
    req: new Request(
      "http://127.0.0.1/api/trpc/setting.index,page.menuOptions,category.adminTree,menu.adminIndex?batch=1&input=" +
        encodeURIComponent(JSON.stringify({ 1: { limit: 100 } })),
    ),
    createContext: () => ({
      db,
      user: { id: actor, name: "Admin", level: UserLevel.ADMIN },
      header: new Headers(),
      hasRequest: true,
      requestId: "snapshot-test",
      requestObservabilityEnabled: true,
    }),
  });
}

const statementSql = (statement: InStatement) =>
  typeof statement === "string" ? statement : statement.sql;

describe("admin read snapshots on local SQLite", () => {
  beforeEach(() => configureObservability(createMemoryObservability()));
  afterEach(() => {
    vi.restoreAllMocks();
    configureObservability();
  });

  it("serves the real menu HTTP batch alongside a session insert without interactive read locks", async () => {
    // This regression runs in Node, as does the Next CLI; no browser or socket
    // is needed to exercise the actual routers, adapter and local driver.
    expect(process.versions.bun).toBeUndefined();
    await withSnapshots(async (db) => {
      const requests = await Promise.allSettled([
        menuRequest(db),
        menuRequest(db),
        db
          .insert(schema.session)
          .values({
            id: "snapshot-session",
            token: "snapshot-test-only-token",
            userId: actor,
            expiresAt: new Date("2027-01-01"),
            createdAt: new Date(stamp),
            updatedAt: new Date(stamp),
          })
          .returning({ id: schema.session.id }),
      ]);
      expect(requests.map(({ status }) => status)).toEqual([
        "fulfilled",
        "fulfilled",
        "fulfilled",
      ]);
      for (const result of requests.slice(0, 2)) {
        if (
          result.status !== "fulfilled" ||
          !(result.value instanceof Response)
        )
          throw new Error("Expected a completed tRPC response");
        const body: unknown = await result.value.json();
        expect(result.value.status, JSON.stringify(body)).toBe(200);
        expect(body).toHaveLength(4);
        if (!Array.isArray(body)) throw new Error("Expected a tRPC batch");
        for (const response of body) {
          expect(response).not.toHaveProperty("error");
          expect(response).toHaveProperty("result.data");
        }
      }
      expect(
        await db.select({ id: schema.session.id }).from(schema.session),
      ).toEqual([{ id: "snapshot-session" }]);
    });
  });

  it.each([
    ["settings", getSetting],
    ["menu", getMenuSnapshot],
  ] as const)(
    "allows a session insert alongside the %s snapshot",
    async (_name, read) => {
      await withSnapshots(async (db) => {
        const results = await Promise.allSettled([
          read(db),
          db
            .insert(schema.session)
            .values({
              id: "parallel-session",
              token: "parallel-test-only-token",
              userId: actor,
              expiresAt: new Date("2027-01-01"),
              createdAt: new Date(stamp),
              updatedAt: new Date(stamp),
            })
            .returning({ id: schema.session.id }),
        ]);
        expect(results.map(({ status }) => status)).toEqual([
          "fulfilled",
          "fulfilled",
        ]);
      });
    },
  );

  it("reads setting version and translations in one statement and the entire menu snapshot in one native batch", async () => {
    await withSnapshots(async (db, client) => {
      const execute = vi.spyOn(client, "execute");
      const batch = vi.spyOn(client, "batch");
      const transaction = vi.spyOn(client, "transaction");
      await getSetting(db);
      expect(execute).toHaveBeenCalledTimes(1);
      const settingCall = execute.mock.calls[0];
      if (!settingCall) throw new Error("Expected a setting statement");
      const settingSql = statementSql(settingCall[0]);
      expect(settingSql).toContain('"version"');
      expect(settingSql).toContain('"setting_translation"');
      execute.mockClear();
      await getMenuSnapshot(db);
      expect(transaction).not.toHaveBeenCalled();
      expect(execute).not.toHaveBeenCalled();
      expect(batch).toHaveBeenCalledTimes(1);
      const menuCall = batch.mock.calls[0];
      if (!menuCall) throw new Error("Expected a menu snapshot batch");
      const statements = menuCall[0];
      expect(statements).toHaveLength(2);
      const queries = statements.map((statement) =>
        statementSql(Array.isArray(statement) ? statement[0] : statement),
      );
      expect(queries[0]).toContain('"menu_revision"');
      for (const table of ["menu", "category_translation", "page_translation"])
        expect(queries[1]).toContain(`"${table}"`);
      // The native batch, not independent client reads, owns both statements.
      // libSQL's default deferred batch is atomic; this is not a lock-free claim.
    });
  });

  it("preserves settings DTO versions, localized values and absent records", async () => {
    await withSnapshots(async (db) => {
      expect(await getSetting(db)).toEqual({
        id: setting,
        version: 7,
        siteRecordNo: null,
        siteRecordUrl: null,
        createdAt: stamp,
        updatedAt: stamp,
        siteName: { en: "Site", zh: "站点" },
        siteSubName: null,
        siteSignature: null,
        siteCopyright: null,
      });
      await db.delete(schema.settingTranslation);
      expect(await getSetting(db)).toMatchObject({
        version: 7,
        siteName: null,
      });
      await db.delete(schema.setting);
      expect(await getSetting(db)).toBeUndefined();
    });
  });

  it("cannot combine a settings version with another committed translation snapshot", async () => {
    await withSnapshots(async (db) => {
      const results = await Promise.allSettled([
        getSetting(db),
        db.batch([
          db.update(schema.setting).set({ version: 8 }),
          db.update(schema.settingTranslation).set({ siteName: "Updated" }),
        ]),
      ]);
      expect(results.map(({ status }) => status)).toEqual([
        "fulfilled",
        "fulfilled",
      ]);
      const [read] = results;
      if (read.status !== "fulfilled")
        throw new Error("Expected a settings snapshot");
      const snapshot = read.value;
      expect([
        { version: 7, siteName: { en: "Site", zh: "站点" } },
        { version: 8, siteName: { en: "Updated", zh: "Updated" } },
      ]).toContainEqual({
        version: snapshot?.version,
        siteName: snapshot?.siteName,
      });
      expect(await getSetting(db)).toMatchObject({
        version: 8,
        siteName: { en: "Updated", zh: "Updated" },
      });
    });
  });

  it("cannot combine a menu revision with another committed tree or title snapshot", async () => {
    await withSnapshots(async (db) => {
      const results = await Promise.allSettled([
        getMenuSnapshot(db),
        db.batch([
          db.update(schema.menuRevision).set({ version: 8 }),
          db
            .update(schema.menu)
            .set({ power: 4 })
            .where(eq(schema.menu.id, "category-row")),
          db.update(schema.categoryTranslation).set({ title: "Updated" }),
        ]),
      ]);
      expect(results.map(({ status }) => status)).toEqual([
        "fulfilled",
        "fulfilled",
      ]);
      const [read] = results;
      if (read.status !== "fulfilled")
        throw new Error("Expected a menu snapshot");
      const snapshot = read.value;
      const entry = snapshot.list.find(({ id }) => id === category);
      expect([
        { version: 7, power: 1, title: { en: "Category", zh: "分类" } },
        { version: 8, power: 4, title: { en: "Updated", zh: "Updated" } },
      ]).toContainEqual({
        version: snapshot.version,
        power: entry?.power,
        title: entry?.title,
      });
      expect((await getMenuSnapshot(db)).version).toBe(8);
    });
  });

  it("preserves all-target menu titles, ordering, business parents and empty-tree revisions", async () => {
    await withSnapshots(async (db) => {
      const dates = { createdAt: stamp, updatedAt: stamp };
      expect(await getMenuSnapshot(db)).toEqual({
        version: 7,
        total: 3,
        list: [
          {
            ...dates,
            id: category,
            parent: null,
            power: 1,
            type: MenuType.CATEGORY,
            title: { en: "Category", zh: "分类" },
            path: "hidden",
          },
          {
            ...dates,
            id: page,
            parent: null,
            power: 2,
            type: MenuType.PAGE,
            title: { en: "Page", zh: "页面" },
            path: null,
          },
          {
            ...dates,
            id: "custom-business-id",
            parent: category,
            power: 3,
            type: MenuType.CUSTOM,
            title: undefined,
            path: null,
          },
        ],
      });
      // Public filtering remains in the existing listMenus path.
      expect(await listMenus(db, "PUBLIC_ONLY")).toEqual({
        list: [],
        total: 0,
      });
      await db.delete(schema.menu);
      expect(await getMenuSnapshot(db)).toEqual({
        list: [],
        total: 0,
        version: 7,
      });
      await db.delete(schema.menuRevision);
      await expect(getMenuSnapshot(db)).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
        message: "菜单版本尚未初始化",
      });
    });
  });

  it("keeps deleted targets and dangling parents representable without inventing titles", async () => {
    await withSnapshots(async (db, client) => {
      // A dangling legacy parent cannot be authored through the current FK.
      // Corrupt this owned fixture only; normal database enforcement is retained.
      await client.execute("PRAGMA foreign_keys = OFF");
      await db
        .update(schema.menu)
        .set({ categoryId: null, parent: "absent-row" })
        .where(eq(schema.menu.id, "category-row"));
      await db
        .update(schema.menu)
        .set({ pageId: null })
        .where(eq(schema.menu.id, "page-row"));
      await client.execute("PRAGMA foreign_keys = ON");
      const snapshot = await getMenuSnapshot(db);
      expect(snapshot.list).toEqual([
        expect.objectContaining({
          id: "category-row",
          parent: null,
          title: null,
          path: undefined,
        }),
        expect.objectContaining({
          id: "page-row",
          parent: null,
          title: null,
          path: null,
        }),
        expect.objectContaining({ id: "custom-business-id", parent: null }),
      ]);
    });
  });

  it("rejects a corrupt stored menu type rather than exposing it as a valid DTO", async () => {
    await withSnapshots(async (db, client) => {
      // Deliberately corrupt only this disposable fixture to exercise the
      // existing persistence-boundary validation independently of CHECKs.
      await client.execute("PRAGMA ignore_check_constraints = ON");
      await db
        .update(schema.menu)
        .set({ type: "UNKNOWN" })
        .where(eq(schema.menu.id, "custom-row"));
      await client.execute("PRAGMA ignore_check_constraints = OFF");
      await expect(getMenuSnapshot(db)).rejects.toMatchObject({
        code: "INTERNAL_SERVER_ERROR",
      });
    });
  });

  it("retains null titles for incomplete translations and missing referenced records", async () => {
    await withSnapshots(async (db, client) => {
      await db
        .delete(schema.categoryTranslation)
        .where(eq(schema.categoryTranslation.locale, MultiLangEnum.En));
      await db.delete(schema.pageTranslation);
      let snapshot = await getMenuSnapshot(db);
      expect(snapshot.list[0]).toMatchObject({
        id: category,
        title: null,
        path: "hidden",
      });
      expect(snapshot.list[1]).toMatchObject({
        id: page,
        title: null,
        path: null,
      });

      // Legacy dangling foreign keys remain visible in ALL snapshots; only
      // this disposable fixture bypasses constraints to model that state.
      await client.execute("PRAGMA foreign_keys = OFF");
      await db
        .update(schema.menu)
        .set({ categoryId: "missing-category" })
        .where(eq(schema.menu.id, "category-row"));
      await db
        .update(schema.menu)
        .set({ pageId: "missing-page" })
        .where(eq(schema.menu.id, "page-row"));
      await db
        .update(schema.menu)
        .set({ customId: null })
        .where(eq(schema.menu.id, "custom-row"));
      await client.execute("PRAGMA foreign_keys = ON");
      snapshot = await getMenuSnapshot(db);
      expect(snapshot.list[0]).toMatchObject({
        id: "missing-category",
        title: null,
        path: undefined,
      });
      expect(snapshot.list[1]).toMatchObject({
        id: "missing-page",
        title: null,
        path: null,
      });
      expect(snapshot.list[2]).toMatchObject({
        id: "custom-row",
        parent: "missing-category",
      });
    });
  });
});
