import type { menu } from "@/lib/db/schema";
import { requireDefined } from "@tests/helpers/require-defined";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { menuRouter } from "@/features/menu/router";
import { MenuType } from "@/features/menu/types/menu.type";
import { TEST_IDS } from "@tests/helpers/test-constants";
import {
  createMockContext,
  createMockDb,
  resetMockDb,
} from "@tests/helpers/test-utils";

// 模拟数据库及相关模块。
vi.mock("@/lib/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("Menu Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
  });

  describe("index procedure", () => {
    it("rejects unauthenticated callers from adminIndex", async () => {
      const caller = menuRouter.createCaller(createMockContext(null, mockDb));

      await expect(caller.adminIndex()).rejects.toThrow("UNAUTHORIZED");
    });

    it("should return menu list with categories and pages", async () => {
      const mockMenus = [
        {
          id: TEST_IDS.ID_1,
          parent: null,
          type: MenuType.CATEGORY,
          categoryId: TEST_IDS.ID_1,
          pageId: null,
          customId: null,
          power: 1,
          createdAt: "2026-01-02T03:04:05.000Z",
          updatedAt: null,
        },
        {
          id: TEST_IDS.ID_2,
          parent: null,
          type: MenuType.PAGE,
          categoryId: null,
          pageId: TEST_IDS.ID_2,
          customId: null,
          power: 2,
          createdAt: "2026-01-02T03:04:05.000Z",
          updatedAt: null,
        },
      ] satisfies (typeof menu.$inferSelect)[];
      const category = {
        status: "ENABLE",
        path: "/category1",
        translations: [
          { locale: "en", title: "Category 1" },
          { locale: "zh", title: "分类1" },
        ],
      };
      const page = {
        status: "PUBLISHED",
        translations: [
          { locale: "en", title: "Page 1" },
          { locale: "zh", title: "页面1" },
        ],
      };
      mockDb.query.menu.findMany.mockResolvedValueOnce([
        { ...mockMenus[0], category, page: null },
        { ...mockMenus[1], category: null, page },
      ]);
      const caller = menuRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index();

      expect(mockDb.select).not.toHaveBeenCalled();
      expect(result).toEqual({
        list: [
          {
            id: TEST_IDS.ID_1,
            parent: null,
            power: 1,
            type: MenuType.CATEGORY,
            createdAt: requireDefined(mockMenus[0]).createdAt,
            updatedAt: null,
            title: { en: "Category 1", zh: "分类1" },
            path: category.path,
          },
          {
            id: TEST_IDS.ID_2,
            parent: null,
            power: 2,
            type: MenuType.PAGE,
            createdAt: requireDefined(mockMenus[1]).createdAt,
            updatedAt: null,
            title: { en: "Page 1", zh: "页面1" },
            path: null,
          },
        ],
        total: 2,
      });
    });

    it("should handle empty menu list", async () => {
      mockDb.query.menu.findMany.mockResolvedValueOnce([]);

      const caller = menuRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index();

      expect(result).toEqual({
        list: [],
        total: 0,
      });
    });

    it("omits public menu branches with unavailable resources", async () => {
      const mockMenus = [
        {
          id: TEST_IDS.ID_1,
          parent: null,
          type: MenuType.PAGE,
          categoryId: null,
          pageId: TEST_IDS.ID_1,
          customId: null,
          power: 1,
          createdAt: "2026-01-02T03:04:05.000Z",
          updatedAt: null,
        },
        {
          id: TEST_IDS.ID_2,
          parent: TEST_IDS.ID_1,
          type: MenuType.CUSTOM,
          categoryId: null,
          pageId: null,
          customId: TEST_IDS.ID_2,
          power: 2,
          createdAt: "2026-01-02T03:04:05.000Z",
          updatedAt: null,
        },
      ] satisfies (typeof menu.$inferSelect)[];
      mockDb.query.menu.findMany.mockResolvedValueOnce([
        {
          ...mockMenus[0],
          category: null,
          page: { status: "DRAFT", translations: [] },
        },
        { ...mockMenus[1], category: null, page: null },
      ]);
      const caller = menuRouter.createCaller(createMockContext(null, mockDb));
      const result = await caller.index();

      expect(result).toEqual({ list: [], total: 0 });
    });
  });
});
