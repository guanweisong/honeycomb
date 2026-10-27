import { createPostFixture } from "@tests/helpers/post-fixtures";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { postRouter } from "@/features/post/router";
import * as schema from "@/lib/db/schema";
import { PostStatus } from "@/features/post/types/post.status";
import { PostType } from "@/features/post/types/post.type";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import { TEST_IDS } from "@tests/helpers/test-constants";
import {
  createAdminUser,
  createGuestUser,
  createMockContext,
  createMockDb,
  resetMockDb,
} from "@tests/helpers/test-utils";

const mockInvalidatePublicContent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cache/next-public-content-invalidator", () => ({
  publicContentInvalidator: {
    invalidate: (...args: unknown[]) => mockInvalidatePublicContent(...args),
  },
}));

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

describe("Post Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
    mockInvalidatePublicContent.mockResolvedValue({ state: "completed" });
  });

  describe("index procedure", () => {
    it("rejects unauthenticated callers from adminIndex", async () => {
      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      await expect(caller.adminIndex({ page: 1, limit: 10 })).rejects.toThrow(
        "UNAUTHORIZED",
      );
    });

    it("should return post list with pagination", async () => {
      const mockPosts = [
        createPostFixture({
          id: TEST_IDS.ID_1,
          title: { en: "Post 1", zh: "文章1" },
          content: { en: "Content 1", zh: "内容1" },
          status: PostStatus.PUBLISHED,
          type: PostType.ARTICLE,
          createdAt: new Date().toISOString(),
        }),
        createPostFixture({
          id: TEST_IDS.ID_2,
          title: { en: "Post 2", zh: "文章2" },
          content: { en: "Content 2", zh: "内容2" },
          status: PostStatus.PUBLISHED,
          type: PostType.ARTICLE,
          createdAt: new Date().toISOString(),
        }),
      ];
      const mockCount = [{ count: "2" }];

      // 设置文章列表查询的模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(
        mockPosts.map((post) => ({ id: post.id })),
      );
      mockDb.query.post.findMany.mockResolvedValueOnce(
        mockPosts.map((post) => ({
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
        })),
      );

      // 设置总数查询的模拟调用。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: mockPosts.map((post) => ({
          id: post.id,
          type: post.type,
          title: post.title,
          excerpt: null,
          movieTime: null,
          quoteContent: null,
          quoteAuthor: null,
          updatedAt: post.updatedAt,
          cover: undefined,
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
      // EXISTS 标签筛选直接用于文章列表和总数，不再预查文章 ID。
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
    it.each(["completed", "degraded"] as const)(
      "should create post with admin permissions and %s public sync",
      async (state) => {
        mockInvalidatePublicContent.mockResolvedValue({ state });
        mockDb.limit.mockResolvedValueOnce([
          { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
        ]);
        const newPost = {
          version: 0,
          id: TEST_IDS.ID_3,
          title: { en: "New Post", zh: "新文章" },
          content: { en: "New Content", zh: "新内容" },
          status: PostStatus.PUBLISHED,
          type: PostType.ARTICLE,
        };

        mockDb.insert.mockReturnValueOnce(mockDb);
        mockDb.values.mockReturnValueOnce(mockDb);
        mockDb.returning.mockResolvedValueOnce([newPost]);

        const caller = postRouter.createCaller(
          createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
        );

        const result = await caller.create({
          creationToken: "11111111-1111-4111-8111-111111111111",
          title: { en: "New Post", zh: "新文章" },
          content: { en: "New Content", zh: "新内容" },
          status: PostStatus.PUBLISHED,
          type: PostType.ARTICLE,
          categoryId: TEST_IDS.ID_1,
        });

        expect(result).toEqual({
          id: newPost.id,
          version: 0,
          publicSync: state,
        });
        expect(mockDb.insert).toHaveBeenCalledWith(schema.post);
      },
    );

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = postRouter.createCaller(
        createMockContext(createGuestUser(TEST_IDS.ID_2), mockDb),
      );

      await expect(
        caller.create({
          creationToken: "11111111-1111-4111-8111-111111111111",
          title: { en: "New Post", zh: "新文章" },
          content: { en: "New Content", zh: "新内容" },
          status: PostStatus.PUBLISHED,
          type: PostType.ARTICLE,
          categoryId: TEST_IDS.ID_1,
        }),
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should throw UNAUTHORIZED error for unauthenticated users", async () => {
      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.create({
          creationToken: "11111111-1111-4111-8111-111111111111",
          title: { en: "New Post", zh: "新文章" },
          content: { en: "New Content", zh: "新内容" },
          status: PostStatus.PUBLISHED,
          type: PostType.ARTICLE,
          categoryId: TEST_IDS.ID_1,
        }),
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("destroy procedure", () => {
    it("should delete posts with admin permissions", async () => {
      mockDb.limit.mockResolvedValueOnce([
        { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
      ]);
      mockDb.limit.mockResolvedValue([{ version: 0 }]);
      mockDb.returning.mockResolvedValue([{ id: TEST_IDS.ID_1 }]);

      const caller = postRouter.createCaller(
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      const result = await caller.destroy({
        items: [TEST_IDS.ID_1, TEST_IDS.ID_2].map((id) => ({
          id,
          expectedVersion: 0,
        })),
      });

      expect(result).toEqual({ success: true, publicSync: "completed" });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.post);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = postRouter.createCaller(
        createMockContext(createGuestUser(TEST_IDS.ID_2), mockDb),
      );

      await expect(
        caller.destroy({
          items: [TEST_IDS.ID_1, TEST_IDS.ID_2].map((id) => ({
            id,
            expectedVersion: 0,
          })),
        }),
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("update procedure", () => {
    it.each(["completed", "degraded"] as const)(
      "should update post with admin permissions and %s public sync",
      async (state) => {
        mockInvalidatePublicContent.mockResolvedValue({ state });
        const updatedPost = {
          id: TEST_IDS.ID_1,
          title: { en: "Updated Post", zh: "更新的文章" },
          content: { en: "Updated Content", zh: "更新的内容" },
          status: PostStatus.PUBLISHED,
          type: PostType.ARTICLE,
        };

        mockDb.limit.mockResolvedValueOnce([
          { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
        ]);
        mockDb.limit.mockResolvedValueOnce([
          { status: PostStatus.DRAFT, version: 0 },
        ]);
        mockDb.returning.mockResolvedValueOnce([
          { id: updatedPost.id, version: 1 },
        ]);
        mockDb.from.mockImplementation((table: object) => {
          if (table === schema.postTranslation) {
            const read = createMockDb();
            read.where.mockResolvedValue([]);
            return read;
          }
          return mockDb;
        });

        const caller = postRouter.createCaller(
          createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
        );

        const result = await caller.update({
          expectedVersion: 0,
          id: TEST_IDS.ID_1,
          title: { en: "Updated Post", zh: "更新的文章" },
          content: { en: "Updated Content", zh: "更新的内容" },
          status: PostStatus.PUBLISHED,
          type: PostType.ARTICLE,
        });

        expect(result).toEqual({
          id: updatedPost.id,
          version: 1,
          publicSync: state,
        });
        expect(mockDb.update).toHaveBeenCalledWith(schema.post);
        expect(mockInvalidatePublicContent).toHaveBeenCalledWith({
          contents: [{ id: TEST_IDS.ID_1, type: "post" }],
          refreshLayout: true,
          refreshPostIndex: true,
          refreshSitemap: true,
        });
      },
    );

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = postRouter.createCaller(
        createMockContext(createGuestUser(TEST_IDS.ID_2), mockDb),
      );

      await expect(
        caller.update({
          expectedVersion: 0,
          id: TEST_IDS.ID_1,
          title: { en: "Updated Post", zh: "更新的文章" },
          content: { en: "Updated Content", zh: "更新的内容" },
          status: PostStatus.PUBLISHED,
          type: PostType.ARTICLE,
        }),
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("atomic relation update procedure", () => {
    it("should update post tags inside a transaction", async () => {
      const tx = createMockDb();
      const insertError = new Error("insert failed");
      tx.from.mockImplementation((table: object) => {
        if (table === schema.postTranslation) {
          const translations = createMockDb();
          translations.where.mockResolvedValue([]);
          return translations;
        }
        return tx;
      });

      tx.limit.mockResolvedValueOnce([
        { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
      ]);
      tx.limit.mockResolvedValueOnce([
        { version: 0, status: PostStatus.DRAFT },
      ]);
      tx.returning.mockResolvedValueOnce([{ id: TEST_IDS.ID_1, version: 1 }]);
      tx.delete.mockReturnValueOnce(tx);
      tx.insert.mockReturnValueOnce(tx);
      tx.values.mockRejectedValueOnce(insertError);

      mockDb.transaction.mockImplementationOnce(
        async (callback: (txDb: typeof tx) => Promise<unknown>) => callback(tx),
      );

      const caller = postRouter.createCaller(
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      await expect(
        caller.update({
          id: TEST_IDS.ID_1,
          expectedVersion: 0,
          movieActorIds: [TEST_IDS.ID_2],
        }),
      ).rejects.toThrow("insert failed");

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      expect(tx.delete).toHaveBeenCalledWith(schema.postTag);
      expect(tx.insert).toHaveBeenCalledWith(schema.postTag);
      expect(mockDb.delete).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });
  });

  describe("incrementViews procedure", () => {
    it("returns the latest count without invalidating the static route", async () => {
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([{ views: 8 }]);

      const caller = postRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.incrementViews({ id: TEST_IDS.ID_1 }),
      ).resolves.toEqual({
        views: 8,
      });
      expect(mockInvalidatePublicContent).not.toHaveBeenCalled();
    });
  });
});
