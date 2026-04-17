import { describe, it, expect, beforeEach, vi } from "vitest";
import { menuRouter } from "./menu.router";
import * as schema from "@/packages/db/schema";
import { MenuType } from "./types/menu.type";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { TEST_IDS } from "../../../../../../tests/helpers/test-constants";

// Mock database and related modules
vi.mock("@/packages/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  orderBy: vi.fn(() => mockDb),
  limit: vi.fn(() => mockDb),
  offset: vi.fn(() => mockDb),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  returning: vi.fn(() => mockDb),
  delete: vi.fn(() => mockDb),
  update: vi.fn(() => mockDb),
  set: vi.fn(() => mockDb),
};

describe("Menu Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置所有mock的调用历史
    Object.values(mockDb).forEach((mock) => {
      if (mock && typeof mock.mockReset === "function") {
        mock.mockReset();
        mock.mockReturnValue(mockDb);
      }
    });
  });

  describe("index procedure", () => {
    it("should return menu list with categories and pages", async () => {
      const mockMenus = [
        {
          id: TEST_IDS.ID_1,
          type: MenuType.CATEGORY,
          refId: TEST_IDS.ID_1,
          power: 1,
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          type: MenuType.PAGE,
          refId: TEST_IDS.ID_2,
          power: 2,
          createdAt: new Date(),
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
      const mockCount = [{ count: "2" }];

      // Setup mock chain for menu list query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce(mockMenus as any);

      // Setup mock for categories query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockResolvedValueOnce(mockCategories as any);

      // Setup mock for pages query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockResolvedValueOnce(mockPages as any);

      // Setup mock for count query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount as any);

      const caller = menuRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      });

      const result = await caller.index();

      expect(result).toEqual({
        list: [
          {
            ...mockMenus[0],
            title: mockCategories[0].title,
            path: mockCategories[0].path,
            parent: mockCategories[0].parent,
          },
          {
            ...mockMenus[1],
            title: mockPages[0].title,
            path: null,
            parent: null,
          },
        ],
        total: 2,
      });
    });

    it("should handle empty menu list", async () => {
      const mockMenus: any[] = [];
      const mockCategories: any[] = [];
      const mockPages: any[] = [];
      const mockCount = [{ count: "0" }];

      // Setup mock chain for empty menu list query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce(mockMenus as any);

      // Setup mock for empty categories query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockResolvedValueOnce(mockCategories as any);

      // Setup mock for empty pages query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockResolvedValueOnce(mockPages as any);

      // Setup mock for count query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount as any);

      const caller = menuRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      });

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
          refId: TEST_IDS.ID_1,
          power: 1,
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          type: MenuType.PAGE,
          refId: TEST_IDS.ID_2,
          power: 2,
          createdAt: new Date(),
        },
      ];

      // Setup mock for delete operation
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined as any);

      // Setup mock for insert operation
      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce(menuItems as any);

      const caller = menuRouter.createCaller({
        db: mockDb as any,
        user: { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
        header: new Headers(),
      });

      const result = await caller.saveAll(menuItems);

      expect(result).toEqual({ count: 2 });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.menu);
      expect(mockDb.insert).toHaveBeenCalledWith(schema.menu);
    });

    it("should return 0 count for empty input", async () => {
      // Setup mock for delete operation
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined as any);

      const caller = menuRouter.createCaller({
        db: mockDb as any,
        user: { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
        header: new Headers(),
      });

      const result = await caller.saveAll([]);

      expect(result).toEqual({ count: 0 });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.menu);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const menuItems = [
        {
          id: TEST_IDS.ID_1,
          type: MenuType.CATEGORY,
          refId: TEST_IDS.ID_1,
          power: 1,
          createdAt: new Date(),
        },
      ];

      const caller = menuRouter.createCaller({
        db: mockDb as any,
        user: { id: TEST_IDS.ID_2, level: UserLevel.GUEST },
        header: new Headers(),
      });

      await expect(caller.saveAll(menuItems)).rejects.toThrow("FORBIDDEN");
    });

    it("should throw UNAUTHORIZED error for unauthenticated users", async () => {
      const menuItems = [
        {
          id: TEST_IDS.ID_1,
          type: MenuType.CATEGORY,
          refId: TEST_IDS.ID_1,
          power: 1,
          createdAt: new Date(),
        },
      ];

      const caller = menuRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      });

      await expect(caller.saveAll(menuItems)).rejects.toThrow("UNAUTHORIZED");
    });
  });
});
