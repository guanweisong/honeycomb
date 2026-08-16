import { describe, it, expect, beforeEach, vi } from "vitest";
import { postRouter } from "./post.router";
import * as schema from "@/packages/infrastructure/db/schema";
import { UserLevel } from "@/packages/domain/identity/user";
import { PostStatus } from "@/packages/domain/content/post-status";
import { TEST_IDS } from "@tests/helpers/test-constants";
import {
  createMockContext,
  createMockDb,
  resetMockDb,
} from "@tests/helpers/test-utils";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

// 模拟数据库及相关模块。
vi.mock("@/packages/infrastructure/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

// 模拟文章关联数据加载函数。
vi.mock("@/packages/application/content/post/post-relations", () => ({
  loadPostRelations: vi.fn(
    async (_db: unknown, posts: Array<Record<string, unknown>>) => {
      // 对于 detail 测试，返回关联数据
      if (posts.length === 1) {
        return posts.map((post) => ({
          ...post,
          author: {
            id: post.authorId,
            name: "Test Author",
          },
          category: {
            id: post.categoryId,
            title: { en: "Category 1", zh: "分类1" },
          },
          cover: post.coverId
            ? {
                id: post.coverId,
                url: "https://example.com/cover.jpg",
              }
            : undefined,
          movieActors: [],
          movieDirectors: [],
          movieStyles: [],
          galleryStyles: [],
        }));
      }
      // 对于 list 测试，返回空关联数据
      return posts.map((post) => ({
        ...post,
        author: undefined,
        category: undefined,
        cover: undefined,
        movieActors: [],
        movieDirectors: [],
        movieStyles: [],
        galleryStyles: [],
      }));
    },
  ),
}));

vi.mock("@/packages/infrastructure/cache/upstash-cache", () => ({
  bumpCacheVersion: vi.fn().mockResolvedValue(1),
  getCacheVersion: vi.fn().mockResolvedValue(1),
  getCacheJSON: vi.fn().mockResolvedValue(null),
  setCacheJSON: vi.fn().mockResolvedValue(undefined),
}));

const mockDb = createMockDb();

describe("Post Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
  });

  describe("detail procedure", () => {
    it("allows guest callers to read adminDetail", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([
        {
          id: TEST_IDS.ID_1,
          title: { en: "Post 1", zh: "文章1" },
          content: { en: "Content 1", zh: "内容1" },
          status: PostStatus.DRAFT,
          type: "ARTICLE",
          authorId: TEST_IDS.ID_2,
          categoryId: null,
          coverId: null,
        },
      ]);

      const caller = postRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_2, level: UserLevel.GUEST },
          mockDb,
        ),
      );

      const result = await caller.adminDetail({ id: TEST_IDS.ID_1 });

      expect(result.id).toBe(TEST_IDS.ID_1);
    });
  });

  describe("detail procedure", () => {
    it("should return post details with related data", async () => {
      const mockPost = {
        id: TEST_IDS.ID_1,
        title: { en: "Post 1", zh: "文章1" },
        content: { en: "Content 1", zh: "内容1" },
        status: "PUBLISH",
        type: "ARTICLE",
        categoryId: TEST_IDS.ID_1,
        authorId: TEST_IDS.ID_1,
        coverId: TEST_IDS.ID_1,
        createdAt: new Date(),
      };
      const mockCategory = {
        id: TEST_IDS.ID_1,
        title: { en: "Category 1", zh: "分类1" },
      };
      const mockAuthor = { id: TEST_IDS.ID_1, name: "Test Author" };
      const mockCover = {
        id: TEST_IDS.ID_1,
        url: "https://example.com/cover.jpg",
      };

      // 设置文章详情查询的模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockPost]);

      // 设置分类查询的模拟调用。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockCategory]);

      // 设置作者查询的模拟调用。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockAuthor]);

      // 设置封面查询的模拟调用。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockCover]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.detail({ id: TEST_IDS.ID_1 });

      expect(result).toEqual({
        ...mockPost,
        category: mockCategory,
        author: mockAuthor,
        cover: mockCover,
        movieActors: [],
        movieDirectors: [],
        movieStyles: [],
        galleryStyles: [],
        imagesInContent: [],
      });
    });

    it("should throw NOT_FOUND error for non-existent post", async () => {
      // 设置不存在文章查询的模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.detail({ id: TEST_IDS.ID_NOT_FOUND }),
      ).rejects.toThrow("NOT_FOUND");
    });
  });

  describe("incrementViews procedure", () => {
    it("should increment post views", async () => {
      const updatedViews = { views: 101 };

      // 设置增加浏览量查询的模拟调用链。
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedViews]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.incrementViews({ id: TEST_IDS.ID_1 });

      expect(result).toEqual(updatedViews);
      expect(mockDb.update).toHaveBeenCalledWith(schema.post);
      const where = mockDb.where.mock.calls[0]?.[0];
      expect(new SQLiteSyncDialect().sqlToQuery(where).params).toContain(
        PostStatus.PUBLISHED,
      );
    });

    it("should increment views for any user", async () => {
      const updatedViews = { views: 101 };

      // 设置增加浏览量查询的模拟调用链。
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedViews]);

      const caller = postRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_2, level: UserLevel.GUEST },
          mockDb,
        ),
      );

      const result = await caller.incrementViews({ id: TEST_IDS.ID_1 });

      expect(result).toEqual(updatedViews);
      expect(mockDb.update).toHaveBeenCalledWith(schema.post);
    });

    it("returns NOT_FOUND when no published post is updated", async () => {
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.incrementViews({ id: TEST_IDS.ID_NOT_FOUND }),
      ).rejects.toThrow("NOT_FOUND");
    });

    it("should increment views for unauthenticated users", async () => {
      const updatedViews = { views: 101 };

      // 设置增加浏览量查询的模拟调用链。
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedViews]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.incrementViews({ id: TEST_IDS.ID_1 });

      expect(result).toEqual(updatedViews);
      expect(mockDb.update).toHaveBeenCalledWith(schema.post);
    });

    it("should reject invalid post ids", async () => {
      const caller = postRouter.createCaller(createMockContext(null, mockDb));
      mockDb.update.mockClear();

      await expect(caller.incrementViews({ id: "bad-id" })).rejects.toThrow();
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });

  describe("getCategoryId procedure", () => {
    it("should return category id for post", async () => {
      const mockPost = { categoryId: TEST_IDS.ID_1 };

      // 设置分类 ID 查询的模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([mockPost]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.getCategoryId({ id: TEST_IDS.ID_1 });

      expect(result).toEqual({ categoryId: TEST_IDS.ID_1 });
      const where = mockDb.where.mock.calls[0]?.[0];
      expect(new SQLiteSyncDialect().sqlToQuery(where).params).toContain(
        PostStatus.PUBLISHED,
      );
    });

    it("should return undefined for non-existent post", async () => {
      // 设置不存在文章分类 ID 的模拟查询调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.getCategoryId({
        id: TEST_IDS.ID_NOT_FOUND,
      });

      expect(result).toBeUndefined();
    });
  });

  describe("getRandomByCategory procedure", () => {
    it("should return random posts from category", async () => {
      const mockPosts = [
        { id: TEST_IDS.ID_1, title: "Post 1" },
        { id: TEST_IDS.ID_2, title: "Post 2" },
        { id: TEST_IDS.ID_3, title: "Post 3" },
      ];

      // 设置带排序的随机文章查询模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce(mockPosts);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.getRandomByCategory({
        categoryId: TEST_IDS.ID_1,
      });

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("id");
      expect(result[0]).toHaveProperty("title");
      const where = mockDb.where.mock.calls[0]?.[0];
      expect(new SQLiteSyncDialect().sqlToQuery(where).params).toContain(
        PostStatus.PUBLISHED,
      );
    });
  });
});
