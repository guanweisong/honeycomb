import { describe, it, expect, beforeEach, vi } from "vitest";
import { commentRouter } from "@/features/comment/comment.router";
import { UserLevel } from "@/packages/domain/identity/user";
import { CommentStatus } from "@/packages/domain/content/comment";
import { TEST_IDS } from "@tests/helpers/test-constants";
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

vi.mock("@/features/comment/notifications/comment-email", () => ({
  sendCommentEmail: vi.fn().mockResolvedValue(undefined),
}));

const mockDb = createMockDb();

describe("Comment Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
  });

  describe("create procedure", () => {
    it("rejects replies whose parent belongs to another resource", async () => {
      const comment = {
        id: TEST_IDS.ID_3,
        author: "Test User",
        content: "Reply",
        email: "test@example.com",
        postId: TEST_IDS.ID_1,
        pageId: null,
        customId: null,
        parentId: TEST_IDS.ID_2,
        status: CommentStatus.PUBLISH,
        createdAt: new Date(),
      };

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
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([
        {
          postId: TEST_IDS.ID_2,
          pageId: null,
          customId: null,
        },
      ]);
      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([comment]);
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([comment]);
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockResolvedValueOnce([{ id: TEST_IDS.ID_1 }]);
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([
        { ...comment, postId: TEST_IDS.ID_2 },
      ]);

      const caller = commentRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.create({
          author: "Test User",
          content: "Reply",
          email: "test@example.com",
          captchaToken: "valid-captcha",
          postId: TEST_IDS.ID_1,
          parentId: TEST_IDS.ID_2,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });

    it("should create comment with captcha validation", async () => {
      const newComment = {
        id: TEST_IDS.ID_1,
        author: "Test User",
        content: "New Comment",
        email: "test@example.com",
        ip: "203.0.113.10",
        userAgent: "Sensitive Browser",
        postId: TEST_IDS.ID_1,
        parentId: null,
        status: CommentStatus.PUBLISH,
        createdAt: new Date(),
      };

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

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([newComment]);

      // 模拟获取已创建评论及关联数据的第二次查询。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([newComment]);

      // 模拟站点设置查询。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockResolvedValueOnce([
        { id: "1", key: "comment_notify", value: "true" },
      ]);

      const caller = commentRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.create({
        content: "New Comment",
        author: "Test User",
        email: "test@example.com",
        captchaToken: "valid-captcha",
        postId: TEST_IDS.ID_1,
      });

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty("email");
      expect(result).not.toHaveProperty("ip");
      expect(result).not.toHaveProperty("userAgent");
    });
  });

  describe("update procedure", () => {
    it("should update comment with admin permissions", async () => {
      const updatedComment = {
        id: TEST_IDS.ID_1,
        content: "Updated Comment",
        status: CommentStatus.PUBLISH,
      };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([
        { ...updatedComment, id: TEST_IDS.ID_1 },
      ]);

      const caller = commentRouter.createCaller(
        createMockContext({ id: "1", level: UserLevel.ADMIN }, mockDb),
      );

      const result = await caller.update({
        id: TEST_IDS.ID_1,
        content: "Updated Comment",
      });

      expect(result).toEqual(updatedComment);
      expect(mockDb.update).toHaveBeenCalledWith(expect.any(Object));
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = commentRouter.createCaller(createMockContext({ id: "2", level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.update({
          id: TEST_IDS.ID_1,
          content: "Updated Comment",
        }),
      ).rejects.toThrow();
    });
  });

  describe("destroy procedure", () => {
    it("should delete comments with admin permissions", async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = commentRouter.createCaller(createMockContext({ id: "1", level: UserLevel.ADMIN }, mockDb));

      const result = await caller.destroy({
        ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalledWith(expect.any(Object));
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = commentRouter.createCaller(createMockContext({ id: "2", level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.destroy({
          ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
        }),
      ).rejects.toThrow();
    });
  });
});
