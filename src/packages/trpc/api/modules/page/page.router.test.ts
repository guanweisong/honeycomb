import { describe, it, expect, beforeEach, vi } from "vitest";
import { pageRouter } from "./page.router";
import * as schema from "@/packages/db/schema";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { PageStatus } from "./types/page.status";
import { PageTemplate } from "./types/page.template";
import { TEST_IDS } from "../../../../../../tests/helpers/test-constants";
import { createMockContext, createMockDb, resetMockDb } from "../../../../../../tests/helpers/test-utils";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

// Mock database and related modules
vi.mock("@/packages/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("Page Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
  });

  describe("index procedure", () => {
    it("rejects unauthenticated callers from adminIndex", async () => {
      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.adminIndex({ page: 1, limit: 10 }),
      ).rejects.toThrow("UNAUTHORIZED");
    });

    it("should return page list with pagination", async () => {
      const mockPages = [
        {
          id: TEST_IDS.ID_1,
          title: { en: "Page 1", zh: "页面1" },
          content: { en: "Content 1", zh: "内容1" },
          status: PageStatus.PUBLISHED,
          template: PageTemplate.DEFAULT,
          author: null,
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          title: { en: "Page 2", zh: "页面2" },
          content: { en: "Content 2", zh: "内容2" },
          status: PageStatus.PUBLISHED,
          template: PageTemplate.DEFAULT,
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

      mockDb.query.page.findMany.mockResolvedValueOnce(mockPages);

      // Setup mock for count query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: mockPages.map((page) => ({ ...page, imagesInContent: [] })),
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

      mockDb.query.page.findMany.mockResolvedValueOnce(mockPages);

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

  describe("detail procedure", () => {
    it("allows guest callers to read adminDetail", async () => {
      mockDb.query.page.findFirst.mockResolvedValueOnce({
        id: TEST_IDS.ID_1,
        title: { en: "Page 1", zh: "页面1" },
        content: { en: "Content 1", zh: "内容1" },
        status: PageStatus.DRAFT,
        template: PageTemplate.DEFAULT,
        author: null,
      });

      const caller = pageRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_2, level: UserLevel.GUEST },
          mockDb,
        ),
      );

      const result = await caller.adminDetail({ id: TEST_IDS.ID_1 });

      expect(result?.id).toBe(TEST_IDS.ID_1);
    });
  });

  describe("create procedure", () => {
    it("should create page with admin permissions", async () => {
      const newPage = {
        id: TEST_IDS.ID_3,
        title: { en: "New Page", zh: "新页面" },
        content: { en: "New Content", zh: "新内容" },
        status: "PUBLISH",
        template: PageTemplate.DEFAULT,
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([newPage]);

      const caller = pageRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.create({
        title: { en: "New Page", zh: "新页面" },
        content: { en: "New Content", zh: "新内容" },
        status: "PUBLISH",
        template: PageTemplate.DEFAULT,
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
        template: PageTemplate.DEFAULT,
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
        template: PageTemplate.DEFAULT,
      }),
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("destroy procedure", () => {
    it("should delete pages with admin permissions", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ id: TEST_IDS.ID_1 }]);
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
        template: PageTemplate.DEFAULT,
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
        template: PageTemplate.DEFAULT,
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
        template: PageTemplate.DEFAULT,
      }),
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("detail procedure", () => {
    it("should return page details with author info", async () => {
      const mockAuthor = { id: TEST_IDS.ID_1, name: "Test Author" };
      const mockPage = {
        id: TEST_IDS.ID_1,
        title: { en: "Page 1", zh: "页面1" },
        content: { en: "Content 1", zh: "内容1" },
        status: "PUBLISH",
        template: PageTemplate.DEFAULT,
        authorId: TEST_IDS.ID_1,
        createdAt: new Date(),
      };
      const mockImages = [
        { id: "img1", url: "https://example.com/img1.jpg" },
        { id: "img2", url: "https://example.com/img2.jpg" },
      ];

      // Setup mock chain for page detail query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([mockPage]);

      mockDb.query.page.findFirst.mockResolvedValueOnce({
        ...mockPage,
        author: mockAuthor,
      });

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

      mockDb.query.page.findFirst.mockResolvedValueOnce(null);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.detail({ id: TEST_IDS.ID_NOT_FOUND });

      expect(result).toBeNull();
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
      const where = mockDb.where.mock.calls[0]?.[0];
      expect(new SQLiteSyncDialect().sqlToQuery(where).params).toContain(
        PageStatus.PUBLISHED,
      );
    });

    it("returns NOT_FOUND when no published page is updated", async () => {
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([]);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.incrementViews({ id: TEST_IDS.ID_NOT_FOUND }),
      ).rejects.toThrow("NOT_FOUND");
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
