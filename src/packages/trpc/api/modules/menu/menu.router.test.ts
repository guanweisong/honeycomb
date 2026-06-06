import { describe, it, expect, beforeEach, vi } from "vitest";
import { menuRouter } from "./menu.router";
import * as schema from "@/packages/db/schema";
import { MenuType } from "./types/menu.type";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { TEST_IDS } from "../../../../../../tests/helpers/test-constants";
import { createMockContext, createMockDb, resetMockDb } from "../../../../../../tests/helpers/test-utils";

// Mock database and related modules
vi.mock("@/packages/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("Menu Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
  });

  describe("index procedure", () => {
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

      // Setup mock for categories query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCategories);

      // Setup mock for pages query
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

      // Setup mock for empty categories query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCategories);

      // Setup mock for empty pages query
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
  });

  describe("saveAll procedure", () => {
    it("should save all menu items with admin permissions", async () => {
      const menuItems = [
        {
          id: TEST_IDS.ID_1,
          type: MenuType.CATEGORY,
          categoryId: TEST_IDS.ID_1,
          pageId: null,
          customId: null,
          power: 1,
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          type: MenuType.PAGE,
          categoryId: null,
          pageId: TEST_IDS.ID_2,
          customId: null,
          power: 2,
          createdAt: new Date(),
        },
      ];

      // Setup mock for delete operation
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      // Setup mock for insert operation
      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce(menuItems);

      const caller = menuRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.saveAll(menuItems);

      expect(result).toEqual({ count: 2 });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.menu);
      expect(mockDb.insert).toHaveBeenCalledWith(schema.menu);
    });

    it("should return 0 count for empty input", async () => {
      // Setup mock for delete operation
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = menuRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.saveAll([]);

      expect(result).toEqual({ count: 0 });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.menu);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const menuItems = [
        {
          id: TEST_IDS.ID_1,
          type: MenuType.CATEGORY,
          categoryId: TEST_IDS.ID_1,
          pageId: null,
          customId: null,
          power: 1,
          createdAt: new Date(),
        },
      ];

      const caller = menuRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(caller.saveAll(menuItems)).rejects.toThrow("FORBIDDEN");
    });

    it("should throw UNAUTHORIZED error for unauthenticated users", async () => {
      const menuItems = [
        {
          id: TEST_IDS.ID_1,
          type: MenuType.CATEGORY,
          categoryId: TEST_IDS.ID_1,
          pageId: null,
          customId: null,
          power: 1,
          createdAt: new Date(),
        },
      ];

      const caller = menuRouter.createCaller(createMockContext(null, mockDb));

      await expect(caller.saveAll(menuItems)).rejects.toThrow("UNAUTHORIZED");
    });
  });
});
