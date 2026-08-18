import { describe, it, expect, beforeEach, vi } from "vitest";
import { commentRouter } from "@/features/comment/transport/comment.router";
import { UserLevel } from "@/packages/domain/identity/user";
import { CommentStatus } from "@/packages/domain/content/comment";
import { TEST_IDS } from "@tests/helpers/test-constants";
import { MenuType } from "@/packages/domain/navigation/menu";
import { createMockContext, createMockDb, resetMockDb } from "@tests/helpers/test-utils";
import { PostStatus } from "@/packages/domain/content/post-status";
import { EnableStatus } from "@/packages/domain/shared/enable-status";

// 模拟数据库及相关模块。
vi.mock("@/packages/infrastructure/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("@/packages/infrastructure/security/validate-captcha", () => ({
  validateCaptcha: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/features/comment/application/notifications/comment-email", () => ({
  sendCommentEmail: vi.fn().mockResolvedValue(undefined),
}));

const mockDb = createMockDb();

describe("Comment Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
  });

  describe("index procedure", () => {
    it("should return comment list", async () => {
      const mockComments = [
        {
          id: TEST_IDS.ID_1,
          content: "Comment 1",
          status: CommentStatus.PUBLISH,
          custom: null,
          page: null,
          post: null,
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          content: "Comment 2",
          status: CommentStatus.PUBLISH,
          custom: null,
          page: null,
          post: null,
          createdAt: new Date(),
        },
      ];
      const mockCount = [{ count: "2" }];

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockComments);

      mockDb.query.comment.findMany.mockResolvedValueOnce(mockComments);

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);

      const caller = commentRouter.createCaller(
        createMockContext({ id: "1", level: UserLevel.ADMIN }, mockDb),
      );

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: mockComments,
        total: 2,
      });
    });
  });

  describe("listByRef procedure", () => {
    it("rejects comments when a published post has comments disabled", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([
        {
          id: TEST_IDS.ID_1,
          status: PostStatus.PUBLISHED,
          commentStatus: EnableStatus.DISABLE,
        },
      ]);
      mockDb.query.comment.findMany.mockResolvedValueOnce([]);
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ count: "0" }]);

      const caller = commentRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.listByRef({
          id: TEST_IDS.ID_1,
          type: MenuType.CATEGORY,
        }),
      ).rejects.toThrow("FORBIDDEN");
    });

    it("rejects comments for unavailable public resources", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);

      const caller = commentRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.listByRef({
          id: TEST_IDS.ID_1,
          type: MenuType.CATEGORY,
        }),
      ).rejects.toThrow("NOT_FOUND");
    });

    it("should return tree structure comments for category", async () => {
      const mockComments = [
        {
          id: TEST_IDS.ID_1,
          content: "Comment 1",
          status: "PUBLISH",
          email: "test1@example.com",
          ip: "203.0.113.1",
          userAgent: "Sensitive Browser",
          postId: TEST_IDS.ID_1,
          parentId: null,
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          content: "Comment 2",
          status: "PUBLISH",
          email: "test2@example.com",
          ip: "203.0.113.2",
          userAgent: "Sensitive Browser",
          postId: TEST_IDS.ID_1,
          parentId: TEST_IDS.ID_1,
          createdAt: new Date(),
        },
      ];
      const mockCount = [{ count: "2" }];

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([
        {
          id: TEST_IDS.ID_1,
          status: PostStatus.PUBLISHED,
          commentStatus: EnableStatus.ENABLE,
        },
      ]);

      mockDb.query.comment.findMany.mockResolvedValueOnce(mockComments);

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockImplementationOnce(async () => mockCount as never);

      const caller = commentRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.listByRef({
        id: TEST_IDS.ID_1,
        type: MenuType.CATEGORY,
      });

      expect(result).toEqual({
        list: expect.any(Array),
        total: 2,
      });
      const rootComment = result.list[0]!;
      const childComment = rootComment.children?.[0];
      expect(childComment).toBeDefined();
      if (!childComment) throw new Error("Expected nested public comment");
      expect(rootComment).not.toHaveProperty("email");
      expect(rootComment).not.toHaveProperty("ip");
      expect(rootComment).not.toHaveProperty("userAgent");
      expect(childComment).not.toHaveProperty("email");
      expect(childComment).not.toHaveProperty("ip");
      expect(childComment).not.toHaveProperty("userAgent");
    });

    it("should return empty list for non-existent ref", async () => {
      const mockCount = [{ count: "0" }];

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([
        {
          id: TEST_IDS.ID_1,
          status: PostStatus.PUBLISHED,
          commentStatus: EnableStatus.ENABLE,
        },
      ]);

      mockDb.query.comment.findMany.mockResolvedValueOnce([]);

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockImplementationOnce(async () => mockCount as never);

      const caller = commentRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.listByRef({
        id: TEST_IDS.ID_1,
        type: MenuType.CATEGORY,
      });

      expect(result).toEqual({
        list: [],
        total: 0,
      });
    });
  });
});
