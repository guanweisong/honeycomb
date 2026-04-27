import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { pageRouter } from "./page.router";
import * as schema from "@/packages/db/schema";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { PageStatus } from "./types/page.status";
import { TEST_IDS } from "../../../../../../tests/helpers/test-constants";
import { createMockContext, createMockDb } from "../../../../../../tests/helpers/test-utils";

// Mock database and related modules
vi.mock("@/packages/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("Page Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 重置所有mock的调用历史
    Object.values(mockDb).forEach((mock) => {
      const typedMock = mock as Mock;
      if (mock && typeof mock.mockReset === "function") {
        typedMock.mockReset();
        typedMock.mockReturnValue(mockDb);
      }
    });
  });

  describe("index procedure", () => {
    it("should return page list with pagination", async () => {
      const mockPages = [
        {
          id: TEST_IDS.ID_1,
          title: { en: "Page 1", zh: "页面1" },
          content: { en: "Content 1", zh: "内容1" },
          status: PageStatus.PUBLISHED,
          author: null,
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          title: { en: "Page 2", zh: "页面2" },
          content: { en: "Content 2", zh: "内容2" },
          status: PageStatus.PUBLISHED,
          author: null,
          createdAt: new Date(),
        },
      ];
      const mockCount = [{ count: "2" }];

      // Setup mock chain for page list query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockPages);

      // Setup mock for count query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: mockPages,
        total: 2,
      });
    });

    it("should handle empty page list", async () => {
      const mockPages: unknown[] = [];
      const mockCount = [{ count: "0" }];

      // Setup mock chain for empty page list query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockPages);

      // Setup mock for count query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: [],
        total: 0,
      });
    });
  });

  describe("create procedure", () => {
    it("should create page with admin permissions", async () => {
      const newPage = {
        id: TEST_IDS.ID_3,
        title: { en: "New Page", zh: "新页面" },
        content: { en: "New Content", zh: "新内容" },
        status: "PUBLISH",
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([newPage]);

      const caller = pageRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.create({
        title: { en: "New Page", zh: "新页面" },
        content: { en: "New Content", zh: "新内容" },
        status: "PUBLISH",
      });

      expect(result).toEqual(newPage);
      expect(mockDb.insert).toHaveBeenCalledWith(schema.page);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = pageRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.create({
          title: { en: "New Page", zh: "新页面" },
          content: { en: "New Content", zh: "新内容" },
          status: "PUBLISH",
        }),
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should throw UNAUTHORIZED error for unauthenticated users", async () => {
      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.create({
          title: { en: "New Page", zh: "新页面" },
          content: { en: "New Content", zh: "新内容" },
          status: "PUBLISH",
        }),
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("destroy procedure", () => {
    it("should delete pages with admin permissions", async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = pageRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.destroy({
        ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.page);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = pageRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.destroy({
          ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
        }),
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("update procedure", () => {
    it("should update page with admin permissions", async () => {
      const updatedPage = {
        id: TEST_IDS.ID_1,
        title: { en: "Updated Page", zh: "更新的页面" },
        content: { en: "Updated Content", zh: "更新的内容" },
        status: "PUBLISH",
        author: null,
      };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedPage]);

      const caller = pageRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.update({
        id: TEST_IDS.ID_1,
        title: { en: "Updated Page", zh: "更新的页面" },
        content: { en: "Updated Content", zh: "更新的内容" },
        status: "PUBLISH",
      });

      expect(result).toEqual(updatedPage);
      expect(mockDb.update).toHaveBeenCalledWith(schema.page);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = pageRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.update({
          id: TEST_IDS.ID_1,
          title: { en: "Updated Page", zh: "更新的页面" },
          content: { en: "Updated Content", zh: "更新的内容" },
          status: "PUBLISH",
        }),
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("detail procedure", () => {
    it("should return page details with author info", async () => {
      const mockPage = {
        id: TEST_IDS.ID_1,
        title: { en: "Page 1", zh: "页面1" },
        content: { en: "Content 1", zh: "内容1" },
        status: "PUBLISH",
        authorId: TEST_IDS.ID_1,
        createdAt: new Date(),
      };
      const mockAuthor = { id: TEST_IDS.ID_1, name: "Test Author" };
      const mockImages = [
        { id: "img1", url: "https://example.com/img1.jpg" },
        { id: "img2", url: "https://example.com/img2.jpg" },
      ];

      // Setup mock chain for page detail query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([mockPage]);

      // Setup mock for author query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([mockAuthor]);

      // Setup mock for images query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockImages);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.detail({ id: TEST_IDS.ID_1 });

      expect(result).toEqual({
        ...mockPage,
        author: mockAuthor,
        imagesInContent: [],
      });
    });

    it("should return null for non-existent page", async () => {
      // Setup mock chain for non-existent page
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([]);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.detail({ id: "999999999999999999999999" });

      expect(result).toBeNull();
    });
  });

  describe("getViews procedure", () => {
    it("should return page views", async () => {
      const mockPage = { views: 100 };

      // Setup mock chain for page views query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([mockPage]);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.getViews({ id: TEST_IDS.ID_1 });

      expect(result).toEqual({ views: 100 });
    });

    it("should return 0 for non-existent page", async () => {
      // Setup mock chain for non-existent page views
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([]);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.getViews({ id: "999999999999999999999" });

      expect(result).toEqual({ views: 0 });
    });
  });

  describe("incrementViews procedure", () => {
    it("should increment page views", async () => {
      const updatedViews = { views: 101 };

      // Setup mock chain for increment views
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedViews]);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.incrementViews({ id: TEST_IDS.ID_1 });

      expect(result).toEqual(updatedViews);
      expect(mockDb.update).toHaveBeenCalledWith(schema.page);
    });

    it("should increment views for any user", async () => {
      const updatedViews = { views: 101 };

      // Setup mock chain for increment views
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedViews]);

      const caller = pageRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      const result = await caller.incrementViews({ id: TEST_IDS.ID_1 });

      expect(result).toEqual(updatedViews);
      expect(mockDb.update).toHaveBeenCalledWith(schema.page);
    });

    it("should increment views for unauthenticated users", async () => {
      const updatedViews = { views: 101 };

      // Setup mock chain for increment views
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedViews]);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.incrementViews({ id: TEST_IDS.ID_1 });

      expect(result).toEqual(updatedViews);
      expect(mockDb.update).toHaveBeenCalledWith(schema.page);
    });
  });
});
