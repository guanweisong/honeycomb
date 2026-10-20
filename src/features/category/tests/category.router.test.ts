import { describe, it, expect, beforeEach, vi } from "vitest";
import { categoryRouter } from "@/features/category/router";
import * as schema from "@/lib/db/schema";
import { EnableStatus } from "@/lib/validation/enable-status";
import { TEST_IDS } from "@tests/helpers/test-constants";
import {
  createAdminUser,
  createGuestUser,
  createMockContext,
  createMockDb,
  resetMockDb,
} from "@tests/helpers/test-utils";

// 模拟数据库及相关模块。
vi.mock("@/lib/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("@/lib/cache/refresh-path", () => ({
  publicContentInvalidator: {
    invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
  },
}));

vi.mock("@/lib/db/query/query-builders", () => ({
  buildDrizzleWhere: vi.fn(() => ({})),
  buildDrizzleOrderBy: vi.fn(() => ({})),
}));

vi.mock("@/features/category/tree", () => ({
  sonsTree: vi.fn((list) => list),
}));

const mockDb = createMockDb();

describe("Category Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
  });

  describe("index procedure", () => {
    it("rejects unauthenticated callers from adminIndex", async () => {
      const caller = categoryRouter.createCaller(
        createMockContext(null, mockDb),
      );

      await expect(caller.adminIndex({ page: 1, limit: 10 })).rejects.toThrow(
        "UNAUTHORIZED",
      );
    });

    it("should return category list", async () => {
      const mockCategories = [
        {
          id: TEST_IDS.ID_1,
          title: { en: "Category 1", zh: "分类1" },
          description: { en: "Description 1", zh: "描述1" },
          status: EnableStatus.ENABLE,
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          title: { en: "Category 2", zh: "分类2" },
          description: { en: "Description 2", zh: "描述2" },
          status: EnableStatus.ENABLE,
          createdAt: new Date(),
        },
      ];
      const mockCount = [{ count: "2" }];

      // 设置分类列表查询的模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockCategories);

      // 设置总数查询的模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);
      mockDb.where.mockResolvedValueOnce([
        {
          categoryId: TEST_IDS.ID_1,
          locale: "en",
          title: "Category 1",
          description: "Description 1",
        },
        {
          categoryId: TEST_IDS.ID_1,
          locale: "zh",
          title: "分类1",
          description: "描述1",
        },
        {
          categoryId: TEST_IDS.ID_2,
          locale: "en",
          title: "Category 2",
          description: "Description 2",
        },
        {
          categoryId: TEST_IDS.ID_2,
          locale: "zh",
          title: "分类2",
          description: "描述2",
        },
      ]);

      const caller = categoryRouter.createCaller(
        createMockContext(null, mockDb),
      );

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: mockCategories.map((item) => ({ ...item, deepPath: 0 })),
        total: 2,
      });
    });
  });

  describe("create procedure", () => {
    it("should create category with admin permissions", async () => {
      const newCategory = {
        id: TEST_IDS.ID_3,
        title: { en: "New Category", zh: "新分类" },
        status: EnableStatus.ENABLE,
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([newCategory]);

      const caller = categoryRouter.createCaller(
        createMockContext(createAdminUser("1"), mockDb),
      );

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);
      const result = await caller.create({
        title: { en: "New Category", zh: "新分类" },
        description: { en: "New category description", zh: "新分类描述" },
        path: "/new-category",
        status: EnableStatus.ENABLE,
      });

      expect(result).toEqual({
        ...newCategory,
        publicSync: "completed",
        description: { en: "New category description", zh: "新分类描述" },
      });
      expect(mockDb.insert).toHaveBeenCalledWith(schema.category);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = categoryRouter.createCaller(
        createMockContext(createGuestUser("2"), mockDb),
      );

      await expect(
        caller.create({
          title: { en: "New Category", zh: "新分类" },
          description: { en: "New category description", zh: "新分类描述" },
          path: "/new-category",
          status: EnableStatus.ENABLE,
        }),
      ).rejects.toThrow();
    });
  });

  describe("destroy procedure", () => {
    it("accepts more than 100 valid category IDs in one mutation", async () => {
      mockDb.limit.mockResolvedValue([]);
      const caller = categoryRouter.createCaller(
        createMockContext(createAdminUser("1"), mockDb),
      );
      const ids = Array.from({ length: 101 }, (_, index) =>
        index.toString(16).padStart(24, "0"),
      );
      await expect(caller.destroy({ ids })).resolves.toEqual({
        success: true,
        publicSync: "completed",
      });
      expect(mockDb.transaction).toHaveBeenCalledOnce();
      expect(mockDb.delete).toHaveBeenCalledWith(schema.category);
    });

    it.each([{ ids: [] }, { ids: ["malformed"] }])(
      "rejects empty or malformed IDs before persistence: %j",
      async ({ ids }) => {
        const caller = categoryRouter.createCaller(
          createMockContext(createAdminUser("1"), mockDb),
        );
        await expect(caller.destroy({ ids })).rejects.toThrow();
        expect(mockDb.transaction).not.toHaveBeenCalled();
      },
    );

    it("should delete categories with admin permissions", async () => {
      const menuReferences = createMockDb();
      menuReferences.limit.mockResolvedValue([]);
      mockDb.select.mockReturnValue(menuReferences);
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = categoryRouter.createCaller(
        createMockContext(createAdminUser("1"), mockDb),
      );

      const result = await caller.destroy({
        ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
      });

      expect(result).toEqual({ success: true, publicSync: "completed" });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.category);
      expect(mockDb.transaction).toHaveBeenCalledOnce();
      expect(menuReferences.from).toHaveBeenCalledWith(schema.menu);
      expect(menuReferences.limit).toHaveBeenCalledWith(1);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = categoryRouter.createCaller(
        createMockContext(createGuestUser("2"), mockDb),
      );

      await expect(
        caller.destroy({
          ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
        }),
      ).rejects.toThrow();
    });
  });

  describe("update procedure", () => {
    it("should update category with admin permissions", async () => {
      const updatedCategory = {
        id: TEST_IDS.ID_1,
        title: { en: "Updated Category", zh: "更新的分类" },
        status: EnableStatus.ENABLE,
      };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedCategory]);

      const caller = categoryRouter.createCaller(
        createMockContext(createAdminUser("1"), mockDb),
      );

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([
        {
          id: TEST_IDS.ID_1,
          parent: null,
          path: "old",
          status: EnableStatus.ENABLE,
        },
      ]);
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.where.mockResolvedValueOnce([
        {
          categoryId: TEST_IDS.ID_1,
          locale: "en",
          title: "Updated Category",
          description: "Updated category description",
        },
        {
          categoryId: TEST_IDS.ID_1,
          locale: "zh",
          title: "更新的分类",
          description: "更新的分类描述",
        },
      ]);
      const result = await caller.update({
        id: TEST_IDS.ID_1,
        title: { en: "Updated Category", zh: "更新的分类" },
        description: {
          en: "Updated category description",
          zh: "更新的分类描述",
        },
        path: "/updated-category",
      });

      expect(result).toEqual({
        ...updatedCategory,
        publicSync: "completed",
        description: {
          en: "Updated category description",
          zh: "更新的分类描述",
        },
      });
      expect(mockDb.update).toHaveBeenCalledWith(schema.category);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = categoryRouter.createCaller(
        createMockContext(createGuestUser("2"), mockDb),
      );

      await expect(
        caller.update({
          id: TEST_IDS.ID_1,
          title: { en: "Updated Category", zh: "更新的分类" },
          description: {
            en: "Updated category description",
            zh: "更新的分类描述",
          },
          path: "/updated-category",
        }),
      ).rejects.toThrow();
    });
  });
});
