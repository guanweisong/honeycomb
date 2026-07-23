import { describe, it, expect, beforeEach, vi } from "vitest";
import { commentRouter } from "./comment.router";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { CommentStatus } from "./types/comment.status";
import { TEST_IDS } from "../../../../../../tests/helpers/test-constants";
import { MenuType } from "@/packages/trpc/api/modules/menu/types/menu.type";
import { createMockContext, createMockDb, resetMockDb } from "../../../../../../tests/helpers/test-utils";
import { PostStatus } from "@/packages/trpc/api/modules/post/types/post.status";
import { EnableStatus } from "@/packages/trpc/api/types/enable.status";

// Mock database and related modules
vi.mock("@/packages/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("@/packages/trpc/api/utils/validateCaptcha", () => ({
  validateCaptcha: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/packages/trpc/api/utils/sendEmail", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
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

      // Mock the second query for getting the created comment with refs
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([newComment]);

      // Mock the setting query
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
