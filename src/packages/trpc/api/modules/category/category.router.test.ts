import { describe, it, expect, beforeEach, vi } from "vitest";
import { categoryRouter } from "./category.router";
import * as schema from "@/packages/db/schema";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { UserStatus } from "@/packages/trpc/api/modules/user/types/user.status";
import { TEST_IDS } from "../../../../../../tests/helpers/test-constants";
import { createMockContext, createMockDb } from "../../../../../../tests/helpers/test-utils";

// Mock database and related modules
vi.mock("@/packages/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("@/packages/trpc/api/utils/tools", () => ({
  buildDrizzleWhere: vi.fn(() => ({})),
  buildDrizzleOrderBy: vi.fn(() => ({})),
  default: {
    sonsTree: vi.fn((list) => list),
  },
}));

const mockDb = createMockDb();

describe("Category Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("index procedure", () => {
    it("should return category list", async () => {
      const mockCategories = [
        {
          id: TEST_IDS.ID_1,
          title: { en: "Category 1", zh: "分类1" },
          status: UserStatus.ENABLE,
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          title: { en: "Category 2", zh: "分类2" },
          status: UserStatus.ENABLE,
          createdAt: new Date(),
        },
      ];
      const mockCount = [{ count: "2" }];

      // Setup mock chain for category list query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockCategories);

      // Setup mock chain for count query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);

      const caller = categoryRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: mockCategories,
        total: 2,
      });
    });
  });

  describe("create procedure", () => {
    it("should create category with admin permissions", async () => {
      const newCategory = {
        id: TEST_IDS.ID_3,
        title: { en: "New Category", zh: "新分类" },
        status: UserStatus.ENABLE,
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([newCategory]);

      const caller = categoryRouter.createCaller(
        createMockContext({ id: "1", level: UserLevel.ADMIN }, mockDb),
      );

      const result = await caller.create({
        title: { en: "New Category", zh: "新分类" },
        description: { en: "New category description", zh: "新分类描述" },
        path: "/new-category",
        status: UserStatus.ENABLE,
      });

      expect(result).toEqual(newCategory);
      expect(mockDb.insert).toHaveBeenCalledWith(schema.category);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = categoryRouter.createCaller(
        createMockContext({ id: "2", level: UserLevel.GUEST }, mockDb),
      );

      await expect(
        caller.create({
          title: { en: "New Category", zh: "新分类" },
          description: { en: "New category description", zh: "新分类描述" },
          path: "/new-category",
          status: UserStatus.ENABLE,
        }),
      ).rejects.toThrow();
    });
  });

  describe("destroy procedure", () => {
    it("should delete categories with admin permissions", async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = categoryRouter.createCaller(
        createMockContext({ id: "1", level: UserLevel.ADMIN }, mockDb),
      );

      const result = await caller.destroy({
        ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.category);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = categoryRouter.createCaller(
        createMockContext({ id: "2", level: UserLevel.GUEST }, mockDb),
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
        status: UserStatus.ENABLE,
      };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedCategory]);

      const caller = categoryRouter.createCaller(
        createMockContext({ id: "1", level: UserLevel.ADMIN }, mockDb),
      );

      const result = await caller.update({
        id: TEST_IDS.ID_1,
        title: { en: "Updated Category", zh: "更新的分类" },
        description: {
          en: "Updated category description",
          zh: "更新的分类描述",
        },
        path: "/updated-category",
      });

      expect(result).toEqual(updatedCategory);
      expect(mockDb.update).toHaveBeenCalledWith(schema.category);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = categoryRouter.createCaller(
        createMockContext({ id: "2", level: UserLevel.GUEST }, mockDb),
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
