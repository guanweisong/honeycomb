import { describe, it, expect, beforeEach, vi } from "vitest";
import { postRouter } from "./post.router";
import * as schema from "@/packages/infrastructure/db/schema";
import { UserLevel } from "@/packages/domain/identity/user";
import { PostStatus } from "@/packages/domain/content/post-status";
import { TagType } from "@/packages/domain/content/tag";
import { TEST_IDS } from "../../../../../../tests/helpers/test-constants";
import {
  createMockContext,
  createMockDb,
  resetMockDb,
} from "../../../../../../tests/helpers/test-utils";

// 模拟数据库及相关模块。
vi.mock("@/packages/infrastructure/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

// 模拟文章关联数据加载函数。
vi.mock("@/packages/trpc/api/modules/post/utils/relations", () => ({
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

vi.mock("@/packages/trpc/api/utils/upstash-cache", () => ({
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

  describe("index procedure", () => {
    it("rejects unauthenticated callers from adminIndex", async () => {
      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.adminIndex({ page: 1, limit: 10 }),
      ).rejects.toThrow("UNAUTHORIZED");
    });

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

      // 设置文章列表查询的模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockPosts);

      // 设置总数查询的模拟调用。
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

      // 设置空文章列表查询的模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockPosts);

      // 设置总数查询的模拟调用。
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
      // 模拟 postTag 查询不返回文章 ID，再执行总数查询。
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
      // 模拟 postTag 风格的作者筛选查询不返回文章。
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

      const caller = postRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

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
      const caller = postRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_2, level: UserLevel.GUEST },
          mockDb,
        ),
      );

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
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([
        { id: TEST_IDS.ID_1, categoryId: TEST_IDS.ID_1 },
        { id: TEST_IDS.ID_2, categoryId: TEST_IDS.ID_2 },
      ]);

      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = postRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

      const result = await caller.destroy({
        ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.post);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = postRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_2, level: UserLevel.GUEST },
          mockDb,
        ),
      );

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

      const caller = postRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

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
      const caller = postRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_2, level: UserLevel.GUEST },
          mockDb,
        ),
      );

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

  describe("updateTags procedure", () => {
    it("should update post tags inside a transaction", async () => {
      const tx = createMockDb();
      const insertError = new Error("insert failed");

      tx.delete.mockReturnValueOnce(tx);
      tx.where.mockResolvedValueOnce(undefined);
      tx.insert.mockReturnValueOnce(tx);
      tx.values.mockRejectedValueOnce(insertError);

      mockDb.transaction.mockImplementationOnce(
        async (callback: (txDb: typeof tx) => Promise<unknown>) => callback(tx),
      );

      const caller = postRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

      await expect(
        caller.updateTags({
          postId: TEST_IDS.ID_1,
          tagIds: [TEST_IDS.ID_2],
          type: TagType.ACTOR,
        }),
      ).rejects.toThrow("insert failed");

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      expect(tx.delete).toHaveBeenCalledWith(schema.postTag);
      expect(tx.insert).toHaveBeenCalledWith(schema.postTag);
      expect(mockDb.delete).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });
});
