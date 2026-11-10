import { listMenus } from "@/features/menu/server/menu-queries";
import { MenuType } from "@/features/menu/types/menu.type";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));

it("uses one relational read for every page title", async () => {
  const db = createMockDb();
  db.query.menu.findMany.mockResolvedValue(
    Array.from({ length: 80 }, (_, power) => ({
      id: `row-${power}`,
      pageId: `page-${power}`,
      categoryId: null,
      customId: null,
      type: MenuType.PAGE,
      parent: null,
      power,
      createdAt: null,
      updatedAt: null,
      category: null,
      page: {
        status: "PUBLISHED",
        translations: [
          { locale: "en", title: `Page ${power}` },
          { locale: "zh", title: `页面 ${power}` },
        ],
      },
    })),
  );
  const result = await listMenus(asMockDatabase(db));
  expect(result.total).toBe(80);
  expect(result.list[0]?.title).toEqual({ en: "Page 0", zh: "页面 0" });
  expect(result.list[79]?.title).toEqual({ en: "Page 79", zh: "页面 79" });
  expect(db.query.menu.findMany).toHaveBeenCalledOnce();
  expect(db.select).not.toHaveBeenCalled();
});

describe("required persistence results", () => {
  it("rejects an unknown menu type before constructing navigation", async () => {
    const db = createMockDb();
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
    await expect(listMenus(asMockDatabase(db))).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});
