import type { UserRecord } from "@/features/user/types/user.record";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { SQL } from "drizzle-orm";
import { requireDefined } from "@tests/helpers/require-defined";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { userRouter } from "@/features/user/router";
import * as schema from "@/lib/db/schema";
import { UserLevel } from "@/features/user/types/user.level";
import { UserStatus } from "@/features/user/types/user.status";
import { TRPCError } from "@trpc/server";
import { TEST_IDS } from "@tests/helpers/test-constants";
import {
  createAdminUser,
  createGuestUser,
  createMockContext,
  createMockDb,
  resetMockDb,
} from "@tests/helpers/test-utils";

// 模拟数据库及相关模块。
vi.mock("@/lib/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("@/lib/cache/next-public-content-invalidator", () => ({
  publicContentInvalidator: {
    invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
  },
}));

// 模拟工具模块。
vi.mock("@/lib/db/query/query-builders", () => ({
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
        email: "newuser@example.com",
        createdAt: null,
        updatedAt: null,
      } satisfies UserRecord;

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([newUser]);
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockResolvedValueOnce([]);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);

      const caller = userRouter.createCaller(
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      const result = await caller.create({
        name: "New User",
        email: "newuser@example.com",
        password: "password123",
        level: UserLevel.EDITOR,
        status: UserStatus.ENABLE,
      });

      expect(result).toEqual({ ...newUser, publicSync: "completed" });
      expect(mockDb.insert).toHaveBeenCalledWith(schema.user);
      expect(mockDb.returning).toHaveBeenCalledWith(
        expect.not.objectContaining({ password: expect.anything() }),
      );
    });

    it("should throw FORBIDDEN error for non-admin users", async () => {
      const caller = userRouter.createCaller(
        createMockContext(createGuestUser(TEST_IDS.ID_2), mockDb),
      );

      await expect(
        caller.create({
          name: "New User",
          email: "newuser@example.com",
          password: "password123",
          level: UserLevel.EDITOR,
          status: UserStatus.ENABLE,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(mockDb.insert).not.toHaveBeenCalled();
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
        {
          id: TEST_IDS.ID_1,
          level: UserLevel.ADMIN,
          status: UserStatus.ENABLE,
        },
      ]);

      const caller = userRouter.createCaller(
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
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
        {
          id: TEST_IDS.ID_1,
          level: UserLevel.EDITOR,
          status: UserStatus.ENABLE,
        },
        {
          id: TEST_IDS.ID_2,
          level: UserLevel.GUEST,
          status: UserStatus.ENABLE,
        },
      ]);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([]);
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = userRouter.createCaller(
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      const result = await caller.destroy({
        ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
      });

      expect(result).toEqual({ success: true, publicSync: "completed" });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.user);
    });

    it("should throw FORBIDDEN error for non-admin users", async () => {
      const caller = userRouter.createCaller(
        createMockContext(createGuestUser(TEST_IDS.ID_2), mockDb),
      );

      await expect(
        caller.destroy({ ids: [TEST_IDS.ID_1, TEST_IDS.ID_2] }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(mockDb.delete).not.toHaveBeenCalled();
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
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      await expect(
        caller.update({ id: TEST_IDS.ID_1, level: UserLevel.EDITOR }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("should update user with admin permissions", async () => {
      const updatedUser = {
        id: TEST_IDS.ID_1,
        name: "Updated User",
        level: UserLevel.EDITOR,
        status: UserStatus.ENABLE,
        email: "updated@example.com",
        createdAt: null,
        updatedAt: null,
      } satisfies UserRecord;

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([
        { level: UserLevel.EDITOR, status: UserStatus.ENABLE },
      ]);
      // The email scan is awaited directly, before the privilege recheck.
      mockDb.from.mockResolvedValueOnce([]);
      // The repository rechecks the persisted level inside its write transaction.
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ level: UserLevel.EDITOR }]);
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedUser]);

      const caller = userRouter.createCaller(
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      const result = await caller.update({
        id: TEST_IDS.ID_1,
        name: "Updated User",
        email: "updated@example.com",
        level: UserLevel.EDITOR,
        status: UserStatus.ENABLE,
      });

      expect(result).toEqual({ ...updatedUser, publicSync: "completed" });
      expect(mockDb.update).toHaveBeenCalledWith(schema.user);
      const [predicate] = requireDefined(mockDb.where.mock.calls.at(-1));
      if (!(predicate instanceof SQL))
        throw new Error("Expected the update WHERE SQL");
      expect(new SQLiteSyncDialect().sqlToQuery(predicate)).toMatchObject({
        sql: '"user"."id" = ?',
        params: [TEST_IDS.ID_1],
      });
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
        email: "updated@example.com",
        createdAt: null,
        updatedAt: null,
      } satisfies UserRecord;

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
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      const result = await caller.update({
        id: TEST_IDS.ID_2,
        password: "password123",
      });

      expect(result).toEqual({ ...updatedUser, publicSync: "completed" });
      expect(mockDb.update).toHaveBeenCalledWith(schema.account);
      expect(mockDb.set).toHaveBeenCalledWith(
        expect.objectContaining({ password: expect.stringContaining(":") }),
      );
    });

    it("allows an admin to change another admin account status", async () => {
      const updatedUser = {
        id: TEST_IDS.ID_2,
        name: "Admin 2",
        level: UserLevel.ADMIN,
        status: UserStatus.DISABLE,
        email: "updated@example.com",
        createdAt: null,
        updatedAt: null,
      } satisfies UserRecord;

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([
        { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
      ]);
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedUser]);

      const caller = userRouter.createCaller(
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      await expect(
        caller.update({
          id: TEST_IDS.ID_2,
          status: UserStatus.DISABLE,
        }),
      ).resolves.toEqual({ ...updatedUser, publicSync: "completed" });
    });

    it("should throw FORBIDDEN error for non-admin users", async () => {
      const caller = userRouter.createCaller(
        createMockContext(createGuestUser(TEST_IDS.ID_2), mockDb),
      );

      await expect(
        caller.update({ id: TEST_IDS.ID_2, name: "Updated User" }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });
});
