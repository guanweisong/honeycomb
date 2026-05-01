import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { postRouter } from "./post.router";
import * as schema from "@/packages/db/schema";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { PostStatus } from "./types/post.status";
import { TEST_IDS } from "../../../../../../tests/helpers/test-constants";
import { createMockContext, createMockDb } from "../../../../../../tests/helpers/test-utils";

// Mock database and related modules
vi.mock("@/packages/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

// Mock loadPostRelations
vi.mock("@/packages/trpc/api/modules/post/utils/relations", () => ({
  loadPostRelations: vi.fn(async (_db: unknown, posts: Array<Record<string, unknown>>) => {
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
  }),
}));

const mockDb = createMockDb();

describe("Post Router", () => {
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
    it("should return post list with pagination", async () => {
      const mockPosts = [
        {
          id: TEST_IDS.ID_1,
          title: { en: "Post 1", zh: "文章1" },
          content: { en: "Content 1", zh: "内容1" },
          status: PostStatus.PUBLISHED,
          type: "ARTICLE",
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          title: { en: "Post 2", zh: "文章2" },
          content: { en: "Content 2", zh: "内容2" },
          status: PostStatus.PUBLISHED,
          type: "ARTICLE",
          createdAt: new Date(),
        },
      ];
      const mockCount = [{ count: "2" }];

      // Setup mock chain for post list query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockPosts);

      // Setup mock for count query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: mockPosts.map((post) => ({
          ...post,
          author: undefined,
          category: undefined,
          cover: undefined,
          movieActors: [],
          movieDirectors: [],
          movieStyles: [],
          galleryStyles: [],
        })),
        total: 2,
      });
    });

    it("should handle empty post list", async () => {
      const mockPosts: unknown[] = [];
      const mockCount = [{ count: "0" }];

      // Setup mock chain for empty post list query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockPosts);

      // Setup mock for count query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: [],
        total: 0,
      });
    });

    it("should return empty list when tagId has no posts", async () => {
      // Mock postTag query returning no post ids, then count query.
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([]);

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ count: "0" }]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index({
        page: 1,
        limit: 10,
        tagId: TEST_IDS.ID_4,
      });

      expect(result).toEqual({ list: [], total: 0 });
    });

    it("should return empty list when authorId has no posts", async () => {
      // Mock postTag-style lookup for author filter resulting in no posts
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce([]);

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ count: "0" }]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index({
        page: 1,
        limit: 10,
        authorId: TEST_IDS.ID_5,
      });

      expect(result).toEqual({ list: [], total: 0 });
    });
  });

  describe("create procedure", () => {
    it("should create post with admin permissions", async () => {
      const newPost = {
        id: TEST_IDS.ID_3,
        title: { en: "New Post", zh: "新文章" },
        content: { en: "New Content", zh: "新内容" },
        status: "PUBLISH",
        type: "ARTICLE",
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([newPost]);

      const caller = postRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.create({
        title: { en: "New Post", zh: "新文章" },
        content: { en: "New Content", zh: "新内容" },
        status: "PUBLISH",
        type: "ARTICLE",
        categoryId: TEST_IDS.ID_1,
      });

      expect(result).toEqual(newPost);
      expect(mockDb.insert).toHaveBeenCalledWith(schema.post);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = postRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.create({
          title: { en: "New Post", zh: "新文章" },
          content: { en: "New Content", zh: "新内容" },
          status: PostStatus.PUBLISHED,
          type: "ARTICLE",
          categoryId: TEST_IDS.ID_1,
        }),
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should throw UNAUTHORIZED error for unauthenticated users", async () => {
      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.create({
          title: { en: "New Post", zh: "新文章" },
          content: { en: "New Content", zh: "新内容" },
          status: PostStatus.PUBLISHED,
          type: "ARTICLE",
          categoryId: TEST_IDS.ID_1,
        }),
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("destroy procedure", () => {
    it("should delete posts with admin permissions", async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = postRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.destroy({
        ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.post);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = postRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.destroy({
          ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
        }),
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("update procedure", () => {
    it("should update post with admin permissions", async () => {
      const updatedPost = {
        id: TEST_IDS.ID_1,
        title: { en: "Updated Post", zh: "更新的文章" },
        content: { en: "Updated Content", zh: "更新的内容" },
        status: "PUBLISH",
        type: "ARTICLE",
      };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedPost]);

      const caller = postRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.update({
        id: TEST_IDS.ID_1,
        title: { en: "Updated Post", zh: "更新的文章" },
        content: { en: "Updated Content", zh: "更新的内容" },
        status: "PUBLISH",
        type: "ARTICLE",
      });

      expect(result).toEqual(updatedPost);
      expect(mockDb.update).toHaveBeenCalledWith(schema.post);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = postRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.update({
          id: TEST_IDS.ID_1,
          title: { en: "Updated Post", zh: "更新的文章" },
          content: { en: "Updated Content", zh: "更新的内容" },
          status: PostStatus.PUBLISHED,
          type: "ARTICLE",
        }),
      ).rejects.toThrow("FORBIDDEN");
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

      // Setup mock chain for post detail query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockPost]);

      // Setup mock for category query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockCategory]);

      // Setup mock for author query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockAuthor]);

      // Setup mock for cover query
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
      // Setup mock chain for non-existent post
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

  describe("getViews procedure", () => {
    it("should return post views", async () => {
      const mockPost = { views: 100 };

      // Setup mock chain for post views query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([mockPost]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.getViews({ id: TEST_IDS.ID_1 });

      expect(result).toEqual({ views: 100 });
    });

    it("should return 0 for non-existent post", async () => {
      // Setup mock chain for non-existent post views
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.getViews({ id: TEST_IDS.ID_NOT_FOUND });

      expect(result).toEqual({ views: 0 });
    });
  });

  describe("incrementViews procedure", () => {
    it("should increment post views", async () => {
      const updatedViews = { views: 101 };

      // Setup mock chain for increment views
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedViews]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.incrementViews({ id: TEST_IDS.ID_1 });

      expect(result).toEqual(updatedViews);
      expect(mockDb.update).toHaveBeenCalledWith(schema.post);
    });

    it("should increment views for any user", async () => {
      const updatedViews = { views: 101 };

      // Setup mock chain for increment views
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedViews]);

      const caller = postRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      const result = await caller.incrementViews({ id: TEST_IDS.ID_1 });

      expect(result).toEqual(updatedViews);
      expect(mockDb.update).toHaveBeenCalledWith(schema.post);
    });

    it("should increment views for unauthenticated users", async () => {
      const updatedViews = { views: 101 };

      // Setup mock chain for increment views
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedViews]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.incrementViews({ id: TEST_IDS.ID_1 });

      expect(result).toEqual(updatedViews);
      expect(mockDb.update).toHaveBeenCalledWith(schema.post);
    });
  });

  describe("getCategoryId procedure", () => {
    it("should return category id for post", async () => {
      const mockPost = { categoryId: TEST_IDS.ID_1 };

      // Setup mock chain for category id query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([mockPost]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.getCategoryId({ id: TEST_IDS.ID_1 });

      expect(result).toEqual({ categoryId: TEST_IDS.ID_1 });
    });

    it("should return undefined for non-existent post", async () => {
      // Setup mock chain for non-existent post category id
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.getCategoryId({
        id: "999999999999999999999",
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

      // Setup mock chain for random posts query with orderBy
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
    });
  });
});
