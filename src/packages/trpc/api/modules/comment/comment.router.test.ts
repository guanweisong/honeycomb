import { describe, it, expect, beforeEach, vi } from "vitest";
import { commentRouter } from "./comment.router";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { CommentStatus } from "./types/comment.status";
import { TEST_IDS } from "../../../../../../tests/helpers/test-constants";
import { MenuType } from "@/packages/trpc/api/modules/menu/types/menu.type";

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

const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  orderBy: vi.fn(() => mockDb),
  limit: vi.fn(() => mockDb),
  offset: vi.fn(() => mockDb),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  returning: vi.fn(() => mockDb),
  delete: vi.fn(() => mockDb),
  update: vi.fn(() => mockDb),
  set: vi.fn(() => mockDb),
  leftJoin: vi.fn(() => mockDb),
};

describe("Comment Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      mockDb.offset.mockResolvedValueOnce(mockComments as any);

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount as any);

      const caller = commentRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      });

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: mockComments,
        total: 2,
      });
    });
  });

  describe("listByRef procedure", () => {
    it("should return tree structure comments for category", async () => {
      const mockComments = [
        {
          id: TEST_IDS.ID_1,
          content: "Comment 1",
          status: "PUBLISH",
          email: "test1@example.com",
          postId: TEST_IDS.ID_1,
          parentId: null,
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          content: "Comment 2",
          status: "PUBLISH",
          email: "test2@example.com",
          postId: TEST_IDS.ID_1,
          parentId: TEST_IDS.ID_1,
          createdAt: new Date(),
        },
      ];
      const mockCount = [{ count: "2" }];

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce(mockComments as any);

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount as any);

      const caller = commentRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      });

      const result = await caller.listByRef({
        id: TEST_IDS.ID_1,
        type: MenuType.CATEGORY,
      });

      expect(result).toEqual({
        list: expect.any(Array),
        total: 2,
      });
    });

    it("should return empty list for non-existent ref", async () => {
      const mockCount = [{ count: "0" }];

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockResolvedValueOnce([] as any);

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount as any);

      const caller = commentRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      });

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
    it("should create comment with captcha validation", async () => {
      const newComment = {
        id: TEST_IDS.ID_1,
        content: "New Comment",
        status: CommentStatus.PUBLISH,
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([newComment] as any);

      // Mock the second query for getting the created comment with refs
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([newComment] as any);

      // Mock the setting query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockResolvedValueOnce([
        { id: "1", key: "comment_notify", value: "true" },
      ] as any);

      const caller = commentRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      });

      const result = await caller.create({
        content: "New Comment",
        author: "Test User",
        email: "test@example.com",
        captchaToken: "valid-captcha",
      });

      expect(result).toBeDefined();
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
      ] as any);

      const caller = commentRouter.createCaller({
        db: mockDb as any,
        user: { id: "1", level: UserLevel.ADMIN },
        header: new Headers(),
      });

      const result = await caller.update({
        id: TEST_IDS.ID_1,
        content: "Updated Comment",
      });

      expect(result).toEqual(updatedComment);
      expect(mockDb.update).toHaveBeenCalledWith(expect.any(Object));
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = commentRouter.createCaller({
        db: mockDb as any,
        user: { id: "2", level: "USER" },
        header: new Headers(),
      });

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
      mockDb.where.mockResolvedValueOnce(undefined as any);

      const caller = commentRouter.createCaller({
        db: mockDb as any,
        user: { id: "1", level: UserLevel.ADMIN },
        header: new Headers(),
      });

      const result = await caller.destroy({
        ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalledWith(expect.any(Object));
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = commentRouter.createCaller({
        db: mockDb as any,
        user: { id: "2", level: "USER" },
        header: new Headers(),
      });

      await expect(
        caller.destroy({
          ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
        }),
      ).rejects.toThrow();
    });
  });
});
