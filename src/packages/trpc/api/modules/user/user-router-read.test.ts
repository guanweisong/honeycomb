import { describe, it, expect, beforeEach, vi } from "vitest";
import { userRouter } from "@/features/user/user.router";
import { UserLevel } from "@/packages/domain/identity/user";
import { UserStatus } from "@/packages/domain/identity/user";
import { TRPCError } from "@trpc/server";
import { TEST_IDS } from "@tests/helpers/test-constants";
import {
  createMockContext,
  createMockDb,
  resetMockDb,
} from "@tests/helpers/test-utils";

// 模拟数据库及相关模块。
vi.mock("@/packages/infrastructure/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

// 模拟工具模块。
vi.mock("@/packages/infrastructure/db/query/tools", () => ({
  buildDrizzleWhere: vi.fn(() => ({})),
  buildDrizzleOrderBy: vi.fn(() => ({})),
}));

const mockDb = createMockDb();

describe("User Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
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

      const caller = userRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

      const result = await caller.current();

      expect(result).toEqual(currentUser);
    });

    it("should throw UNAUTHORIZED error for unauthenticated users", async () => {
      const caller = userRouter.createCaller(createMockContext(null, mockDb));

      await expect(caller.current()).rejects.toThrow(TRPCError);
    });
  });

  describe("index procedure", () => {
    it("rejects guest users to prevent email enumeration", async () => {
      const caller = userRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_2, level: UserLevel.GUEST },
          mockDb,
        ),
      );

      await expect(caller.index({ page: 1, limit: 10 })).rejects.toThrow(
        "FORBIDDEN",
      );
    });

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

      // 设置用户列表查询的模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockUsers);

      // 设置总数查询的模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);

      // 使用模拟上下文创建调用方。
      const caller = userRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
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
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: [],
        total: 0,
      });
    });
  });
});
