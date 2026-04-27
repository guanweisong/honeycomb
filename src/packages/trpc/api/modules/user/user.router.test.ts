import { describe, it, expect, beforeEach, vi } from "vitest";
import { userRouter } from "./user.router";
import * as schema from "@/packages/db/schema";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { UserStatus } from "@/packages/trpc/api/modules/user/types/user.status";
import { TRPCError } from "@trpc/server";
import { TEST_IDS } from "../../../../../../tests/helpers/test-constants";
import { createMockContext, createMockDb } from "../../../../../../tests/helpers/test-utils";

// Mock the database and related modules
vi.mock("@/packages/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

// Mock the tools module
vi.mock("@/packages/trpc/api/utils/tools", () => ({
  buildDrizzleWhere: vi.fn(() => ({})),
  buildDrizzleOrderBy: vi.fn(() => ({})),
}));

const mockDb = createMockDb();

describe("User Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("current procedure", () => {
    it("should return current user for authenticated users", async () => {
      const currentUser = {
        id: TEST_IDS.ID_1,
        name: "User 1",
        email: "user1@example.com",
        level: UserLevel.ADMIN,
        status: UserStatus.ENABLE,
      };

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([currentUser]);

      const caller = userRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.current();

      expect(result).toEqual(currentUser);
    });

    it("should throw UNAUTHORIZED error for unauthenticated users", async () => {
      const caller = userRouter.createCaller(createMockContext(null, mockDb));

      await expect(caller.current()).rejects.toThrow(TRPCError);
    });
  });

  describe("index procedure", () => {
    it("should return user list with pagination", async () => {
      const mockUsers = [
        {
          id: TEST_IDS.ID_1,
          name: "User 1",
          email: "user1@example.com",
          password: "pass1",
          level: UserLevel.EDITOR,
          status: UserStatus.ENABLE,
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          name: "User 2",
          email: "user2@example.com",
          password: "pass2",
          level: UserLevel.ADMIN,
          status: UserStatus.ENABLE,
          createdAt: new Date(),
        },
      ];
      const mockCount = [{ count: "2" }];

      // Setup mock chain for user list query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockUsers);

      // Setup mock chain for count query
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);

      // Create caller with mock context
      const caller = userRouter.createCaller(
        createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb),
      );

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: mockUsers,
        total: 2,
      });
    });

    it("should handle empty user list", async () => {
      const mockUsers: unknown[] = [];
      const mockCount = [{ count: "0" }];

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockUsers);

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);

      const caller = userRouter.createCaller(
        createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb),
      );

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: [],
        total: 0,
      });
    });
  });

  describe("create procedure", () => {
    it("should create a new user with admin permissions", async () => {
      const newUser = {
        id: TEST_IDS.ID_3,
        name: "New User",
        level: UserLevel.EDITOR,
        status: UserStatus.ENABLE,
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([newUser]);

      const caller = userRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.create({
        name: "New User",
        email: "newuser@example.com",
        password: "password123",
        level: UserLevel.EDITOR,
        status: UserStatus.ENABLE,
      });

      expect(result).toEqual(newUser);
      expect(mockDb.insert).toHaveBeenCalledWith(schema.user);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = userRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.create({
          name: "New User",
          email: "newuser@example.com",
          password: "password123",
          level: UserLevel.EDITOR,
          status: UserStatus.ENABLE,
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should throw UNAUTHORIZED error for unauthenticated users", async () => {
      const caller = userRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.create({
          name: "New User",
          email: "newuser@example.com",
          password: "password123",
          level: UserLevel.EDITOR,
          status: UserStatus.ENABLE,
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("destroy procedure", () => {
    it("should delete users with admin permissions", async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = userRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.destroy({
        ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.user);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = userRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.destroy({ ids: [TEST_IDS.ID_1, TEST_IDS.ID_2] }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("update procedure", () => {
    it("should update user with admin permissions", async () => {
      const updatedUser = {
        id: TEST_IDS.ID_2,
        name: "Updated User",
        level: UserLevel.EDITOR,
        status: UserStatus.ENABLE,
      };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedUser]);

      const caller = userRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.update({
        id: TEST_IDS.ID_1,
        name: "Updated User",
        email: "updated@example.com",
        level: UserLevel.EDITOR,
        status: UserStatus.ENABLE,
      });

      expect(result).toEqual(updatedUser);
      expect(mockDb.update).toHaveBeenCalledWith(schema.user);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = userRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.update({ id: TEST_IDS.ID_2, name: "Updated User" }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
