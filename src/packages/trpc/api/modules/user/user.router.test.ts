import { describe, it, expect, beforeEach, vi } from "vitest";
import { userRouter } from "./user.router";
import * as schema from "@/packages/infrastructure/db/schema";
import { UserLevel } from "@/packages/domain/identity/user";
import { UserStatus } from "@/packages/domain/identity/user";
import { TRPCError } from "@trpc/server";
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

// 模拟工具模块。
vi.mock("@/packages/trpc/api/utils/tools", () => ({
  buildDrizzleWhere: vi.fn(() => ({})),
  buildDrizzleOrderBy: vi.fn(() => ({})),
}));

const mockDb = createMockDb();

describe("User Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
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
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);

      const caller = userRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

      const result = await caller.create({
        name: "New User",
        email: "newuser@example.com",
        password: "password123",
        level: UserLevel.EDITOR,
        status: UserStatus.ENABLE,
      });

      expect(result).toEqual(newUser);
      expect(mockDb.insert).toHaveBeenCalledWith(schema.user);
      expect(mockDb.returning).toHaveBeenCalledWith(
        expect.not.objectContaining({ password: expect.anything() }),
      );
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = userRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_2, level: UserLevel.GUEST },
          mockDb,
        ),
      );

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
    it("rejects deleting a user who can manage users", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([
        { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
      ]);

      const caller = userRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

      await expect(
        caller.destroy({ ids: [TEST_IDS.ID_1] }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("should delete users with admin permissions", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([
        { level: UserLevel.EDITOR, status: UserStatus.ENABLE },
        { level: UserLevel.GUEST, status: UserStatus.ENABLE },
      ]);
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = userRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

      const result = await caller.destroy({
        ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.user);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = userRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_2, level: UserLevel.GUEST },
          mockDb,
        ),
      );

      await expect(
        caller.destroy({ ids: [TEST_IDS.ID_1, TEST_IDS.ID_2] }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("update procedure", () => {
    it("rejects removing user management from a privileged user", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([
        { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
      ]);

      const caller = userRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

      await expect(
        caller.update({ id: TEST_IDS.ID_1, level: UserLevel.EDITOR }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("should update user with admin permissions", async () => {
      const updatedUser = {
        id: TEST_IDS.ID_2,
        name: "Updated User",
        level: UserLevel.EDITOR,
        status: UserStatus.ENABLE,
      };

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([
        { level: UserLevel.EDITOR, status: UserStatus.ENABLE },
      ]);
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedUser]);

      const caller = userRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

      const result = await caller.update({
        id: TEST_IDS.ID_1,
        name: "Updated User",
        email: "updated@example.com",
        level: UserLevel.EDITOR,
        status: UserStatus.ENABLE,
      });

      expect(result).toEqual(updatedUser);
      expect(mockDb.update).toHaveBeenCalledWith(schema.user);
      expect(mockDb.returning).toHaveBeenCalledWith(
        expect.not.objectContaining({ password: expect.anything() }),
      );
    });

    it("should write a changed password to the Better Auth credential account", async () => {
      const updatedUser = {
        id: TEST_IDS.ID_2,
        name: "Updated User",
        level: UserLevel.EDITOR,
        status: UserStatus.ENABLE,
      };

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([
        { level: UserLevel.EDITOR, status: UserStatus.ENABLE },
      ]);
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedUser]);
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([{ id: "credential-account" }]);
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = userRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

      const result = await caller.update({
        id: TEST_IDS.ID_2,
        password: "password123",
      });

      expect(result).toEqual(updatedUser);
      expect(mockDb.update).toHaveBeenCalledWith(schema.account);
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ password: expect.stringContaining(":") }),
      );
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = userRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_2, level: UserLevel.GUEST },
          mockDb,
        ),
      );

      await expect(
        caller.update({ id: TEST_IDS.ID_2, name: "Updated User" }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
