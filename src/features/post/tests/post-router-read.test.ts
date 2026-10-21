import { PostType } from "@/features/post/post-type";
import { createPostFixture } from "@tests/helpers/post-fixtures";
import { PostWithRelationsSchema } from "../post-read-model";
import { EnableStatus } from "@/lib/validation/enable-status";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { postRouter } from "@/features/post/router";
import * as schema from "@/lib/db/schema";
import { PostStatus } from "@/features/post/post-status";
import { TEST_IDS } from "@tests/helpers/test-constants";
import {
  createGuestUser,
  createMockContext,
  createMockDb,
  resetMockDb,
} from "@tests/helpers/test-utils";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

// 模拟数据库及相关模块。
vi.mock("@/lib/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("@/lib/cache/upstash-cache", () => ({
  bumpCacheVersion: vi.fn().mockResolvedValue(1),
  getCacheVersion: vi.fn().mockResolvedValue(1),
  getCacheJSON: vi.fn().mockResolvedValue(null),
  setCacheJSON: vi.fn().mockResolvedValue(undefined),
}));

const mockDb = createMockDb();

function prepareDetail(
  post: ReturnType<typeof createPostFixture>,
  relations = {},
) {
  mockDb.limit.mockResolvedValueOnce([{ id: post.id }]);
  mockDb.query.post.findMany.mockResolvedValueOnce([
    {
      ...post,
      translations: ["en", "zh"].map((locale) => ({
        postId: post.id,
        locale,
        title: post.title?.[locale as "en" | "zh"] ?? null,
        content: post.content?.[locale as "en" | "zh"] ?? null,
      })),
      author: null,
      category: null,
      cover: null,
      postTags: [],
      ...relations,
    },
  ]);
}

describe("Post Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
  });

  describe("detail procedure", () => {
    it("allows guest callers to read only published adminDetail", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      prepareDetail(
        createPostFixture({
          id: TEST_IDS.ID_1,
          title: { en: "Post 1", zh: "文章1" },
          content: { en: "Content 1", zh: "内容1" },
          status: PostStatus.PUBLISHED,
          type: PostType.ARTICLE,
          authorId: TEST_IDS.ID_2,
          categoryId: TEST_IDS.ID_1,
          coverId: null,
        }),
      );

      const caller = postRouter.createCaller(
        createMockContext(createGuestUser(TEST_IDS.ID_2), mockDb),
      );

      const result = await caller.adminDetail({ id: TEST_IDS.ID_1 });

      expect(result.id).toBe(TEST_IDS.ID_1);
      expect(result.status).toBe(PostStatus.PUBLISHED);
      const dialect = new SQLiteSyncDialect();
      expect(
        dialect.sqlToQuery(mockDb.where.mock.calls[0]?.[0]).params,
      ).toContain(PostStatus.PUBLISHED);
      const relationQuery = mockDb.query.post.findMany.mock.calls[0]?.[0];
      expect(relationQuery?.where).toBeDefined();
      expect(dialect.sqlToQuery(relationQuery.where).params).toContain(
        PostStatus.PUBLISHED,
      );
    });
  });

  describe("detail procedure", () => {
    it("should return post details with related data", async () => {
      const mockPost = createPostFixture({
        id: TEST_IDS.ID_1,
        title: { en: "Post 1", zh: "文章1" },
        content: { en: "Content 1", zh: "内容1" },
        status: PostStatus.PUBLISHED,
        type: PostType.ARTICLE,
        categoryId: TEST_IDS.ID_1,
        authorId: TEST_IDS.ID_1,
        coverId: TEST_IDS.ID_1,
        createdAt: new Date().toISOString(),
      });
      const mockCategory = {
        id: TEST_IDS.ID_1,
        title: { en: "Category 1", zh: "分类1" },
        description: null,
        parent: null,
        status: EnableStatus.ENABLE,
        path: "category",
        createdAt: null,
        updatedAt: null,
      };
      const mockAuthor = { id: TEST_IDS.ID_1, name: "Test Author" };
      const mockCover = {
        id: TEST_IDS.ID_1,
        url: "https://example.com/cover.jpg",
        key: "cover.jpg",
        name: "cover.jpg",
        size: 10,
        type: "image/jpeg",
        color: null,
        width: null,
        height: null,
        createdAt: null,
        updatedAt: null,
      };

      prepareDetail(mockPost, {
        category: {
          ...mockCategory,
          translations: [
            { locale: "en", title: "Category 1", description: null },
            { locale: "zh", title: "分类1", description: null },
          ],
        },
        author: mockAuthor,
        cover: mockCover,
      });

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.detail({ id: TEST_IDS.ID_1 });

      expect(result).toEqual({
        ...PostWithRelationsSchema.parse(mockPost),
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
        createMockContext(createGuestUser(TEST_IDS.ID_2), mockDb),
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
      // 设置带排序的随机文章查询模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce({
        as: () => ({ id: schema.post.id }),
      });
      mockDb.leftJoin.mockResolvedValueOnce([
        {
          id: TEST_IDS.ID_1,
          locale: "en",
          title: "Post 1",
          quoteContent: null,
        },
        {
          id: TEST_IDS.ID_2,
          locale: "en",
          title: "Post 2",
          quoteContent: null,
        },
        {
          id: TEST_IDS.ID_3,
          locale: "en",
          title: "Post 3",
          quoteContent: null,
        },
      ]);

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
