import { describe, it, expect, beforeEach, vi } from "vitest";
import { menuRouter } from "./menu.router";
import { MenuType } from "@/packages/domain/navigation/menu";
import { TEST_IDS } from "@tests/helpers/test-constants";
import {
  createMockContext,
  createMockDb,
  resetMockDb,
} from "@tests/helpers/test-utils";

// 模拟数据库及相关模块。
vi.mock("@/packages/infrastructure/db/db", () => ({
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
          type: MenuType.CATEGORY,
          categoryId: TEST_IDS.ID_1,
          pageId: null,
          customId: null,
          power: 1,
          createdAt: new Date(),
          updatedAt: undefined,
        },
        {
          id: TEST_IDS.ID_2,
          type: MenuType.PAGE,
          categoryId: null,
          pageId: TEST_IDS.ID_2,
          customId: null,
          power: 2,
          createdAt: new Date(),
          updatedAt: undefined,
        },
      ];
      const mockCategories = [
        {
          id: TEST_IDS.ID_1,
          title: { en: "Category 1", zh: "分类1" },
          path: "/category1",
          parent: null,
        },
      ];
      const mockPages = [
        {
          id: TEST_IDS.ID_2,
          title: { en: "Page 1", zh: "页面1" },
        },
      ];
      mockDb.query.menu.findMany.mockResolvedValueOnce(mockMenus);

      // 设置分类查询的模拟调用。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCategories);

      // 设置页面查询的模拟调用。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockPages);

      const caller = menuRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index();

      expect(result).toEqual({
        list: [
          {
            id: mockCategories[0].id,
            parent: null,
            power: 1,
            type: MenuType.CATEGORY,
            createdAt: mockMenus[0].createdAt,
            updatedAt: undefined,
            title: mockCategories[0].title,
            path: mockCategories[0].path,
          },
          {
            id: mockPages[0].id,
            parent: null,
            power: 2,
            type: MenuType.PAGE,
            createdAt: mockMenus[1].createdAt,
            updatedAt: undefined,
            title: mockPages[0].title,
            path: null,
          },
        ],
        total: 2,
      });
    });

    it("should handle empty menu list", async () => {
      const mockMenus: unknown[] = [];
      const mockCategories: unknown[] = [];
      const mockPages: unknown[] = [];
      mockDb.query.menu.findMany.mockResolvedValueOnce(mockMenus);

      // 设置空分类查询的模拟调用。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCategories);

      // 设置空页面查询的模拟调用。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockPages);

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
          createdAt: new Date(),
          updatedAt: undefined,
        },
        {
          id: TEST_IDS.ID_2,
          parent: TEST_IDS.ID_1,
          type: MenuType.CUSTOM,
          categoryId: null,
          pageId: null,
          customId: TEST_IDS.ID_2,
          power: 2,
          createdAt: new Date(),
          updatedAt: undefined,
        },
      ];
      mockDb.query.menu.findMany.mockResolvedValueOnce(mockMenus);
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([]);

      const caller = menuRouter.createCaller(createMockContext(null, mockDb));
      const result = await caller.index();

      expect(result).toEqual({ list: [], total: 0 });
    });
  });
});
