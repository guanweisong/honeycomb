import { listMenus } from "@/features/menu/server/menu-queries";
import { MenuType } from "@/features/menu/types/menu.type";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import * as schema from "@/lib/db/schema";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));

it("groups each translation once while preserving title and branch semantics", async () => {
  const db = createMockDb();
  let reads = 0;
  const pages = Array.from({ length: 80 }, (_, index) => ({
    id: `page-${index}`,
  }));
  db.query.menu.findMany.mockResolvedValue(
    pages.map(({ id }, power) => ({
      id: `row-${id}`,
      pageId: id,
      categoryId: null,
      customId: null,
      type: MenuType.PAGE,
      parent: null,
      power,
      createdAt: null,
      updatedAt: null,
    })),
  );
  const translations = pages.flatMap(({ id }, index) => [
    {
      get pageId() {
        reads++;
        return id;
      },
      locale: "en",
      title: `Page ${index}`,
    },
    {
      get pageId() {
        reads++;
        return id;
      },
      locale: "zh",
      title: `页面 ${index}`,
    },
  ]);
  db.where.mockResolvedValueOnce(pages).mockResolvedValueOnce(translations);
  const result = await listMenus(asMockDatabase(db), "ALL");
  expect(result.total).toBe(80);
  expect(result.list[0]?.title).toEqual({ en: "Page 0", zh: "页面 0" });
  expect(result.list[79]?.title).toEqual({ en: "Page 79", zh: "页面 79" });
  expect(reads).toBeLessThanOrEqual(160 * 2);
});

describe("required persistence results", () => {
  function authorize(db: ReturnType<typeof createMockDb>) {
    db.from.mockImplementation((table: object) => {
      if (table === schema.user) {
        const actor = createMockDb();
        actor.limit.mockResolvedValue([
          { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
        ]);
        return Object.assign(Promise.resolve([]), actor);
      }
      if (
        table === schema.postTranslation ||
        table === schema.settingTranslation ||
        table === schema.pageTranslation
      ) {
        const read = createMockDb();
        read.where.mockResolvedValue([]);
        return read;
      }
      return db;
    });
  }
  it("rejects an unknown menu type before constructing navigation", async () => {
    const db = createMockDb();
    authorize(db);
    db.query.menu.findMany.mockResolvedValue([
      {
        id: "menu",
        parent: null,
        power: 0,
        type: "UNKNOWN",
        categoryId: null,
        pageId: null,
        customId: null,
        createdAt: null,
        updatedAt: null,
      },
    ]);
    await expect(listMenus(asMockDatabase(db), "ALL")).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});
