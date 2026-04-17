import { describe, it, expect, beforeEach, vi } from "vitest";
import { tagRouter } from "./tag.router";
import * as schema from "@/packages/db/schema";
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

describe("Tag Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("index procedure", () => {
    it("should return tag list with pagination", async () => {
      const mockTags = [
        {
          id: TEST_IDS.ID_1,
          name: { en: "Tag 1", zh: "标签1" },
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          name: { en: "Tag 2", zh: "标签2" },
          createdAt: new Date(),
        },
      ];
      const mockCount = [{ count: "2" }];

      // Setup mock chain for tag list query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockTags as any);

      // Setup mock for count query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount as any);

      const caller = tagRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      });

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: mockTags,
        total: 2,
      });
    });

    it("should handle empty tag list", async () => {
      const mockTags: [] = [];
      const mockCount = [{ count: "0" }];

      // Setup mock chain for empty tag list query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockTags as any);

      // Setup mock for count query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount as any);

      const caller = tagRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      });

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: [],
        total: 0,
      });
    });
  });

  describe("create procedure", () => {
    it("should create tag with admin permissions", async () => {
      const newTag = {
        id: TEST_IDS.ID_3,
        name: { en: "New Tag", zh: "新标签" },
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([newTag] as any);

      const caller = tagRouter.createCaller({
        db: mockDb as any,
        user: { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
        header: new Headers(),
      });

      const result = await caller.create({
        name: { en: "New Tag", zh: "新标签" },
      });

      expect(result).toEqual(newTag);
      expect(mockDb.insert).toHaveBeenCalledWith(schema.tag);
    });

    it("should throw FORBIDDEN error for non-admin users", async () => {
      const caller = tagRouter.createCaller({
        db: mockDb as any,
        user: { id: TEST_IDS.ID_2, level: "USER" },
        header: new Headers(),
      });

      await expect(
        caller.create({
          name: { en: "New Tag", zh: "新标签" },
        }),
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should throw UNAUTHORIZED error for unauthenticated users", async () => {
      const caller = tagRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      });

      await expect(
        caller.create({
          name: { en: "New Tag", zh: "新标签" },
        }),
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("destroy procedure", () => {
    it("should delete tags with admin permissions", async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined as any);

      const caller = tagRouter.createCaller({
        db: mockDb as any,
        user: { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
        header: new Headers(),
      });

      const result = await caller.destroy({
        ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.tag);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = tagRouter.createCaller({
        db: mockDb as any,
        user: { id: TEST_IDS.ID_2, level: "USER" },
        header: new Headers(),
      });

      await expect(
        caller.destroy({
          ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
        }),
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("update procedure", () => {
    it("should update tag with admin permissions", async () => {
      const updatedTag = {
        id: TEST_IDS.ID_1,
        name: { en: "Updated Tag", zh: "更新的标签" },
      };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedTag] as any);

      const caller = tagRouter.createCaller({
        db: mockDb as any,
        user: { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
        header: new Headers(),
      });

      const result = await caller.update({
        id: TEST_IDS.ID_1,
        name: { en: "Updated Tag", zh: "更新的标签" },
      });

      expect(result).toEqual(updatedTag);
      expect(mockDb.update).toHaveBeenCalledWith(schema.tag);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = tagRouter.createCaller({
        db: mockDb as any,
        user: { id: TEST_IDS.ID_2, level: "USER" },
        header: new Headers(),
      });

      await expect(
        caller.update({
          id: TEST_IDS.ID_1,
          name: { en: "Updated Tag", zh: "更新的标签" },
        }),
      ).rejects.toThrow("FORBIDDEN");
    });
  });
});
