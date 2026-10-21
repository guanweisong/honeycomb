import type { menu } from "@/lib/db/schema";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { menuRouter } from "@/features/menu/router";
import * as schema from "@/lib/db/schema";
import { MenuType } from "@/features/menu/menu-types";
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

const mockDb = createMockDb();

describe("Menu Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
  });

  describe("saveAll procedure", () => {
    it("should save all menu items with admin permissions", async () => {
      const menuItems = [
        {
          id: TEST_IDS.ID_1,
          parent: null,
          type: MenuType.CATEGORY,
          categoryId: TEST_IDS.ID_1,
          pageId: null,
          customId: null,
          power: 1,
          createdAt: "2026-01-02T03:04:05.000Z",
          updatedAt: null,
        },
        {
          id: TEST_IDS.ID_2,
          parent: null,
          type: MenuType.PAGE,
          categoryId: null,
          pageId: TEST_IDS.ID_2,
          customId: null,
          power: 2,
          createdAt: "2026-01-02T03:04:05.000Z",
          updatedAt: null,
        },
      ] satisfies (typeof menu.$inferSelect)[];

      mockDb.limit.mockResolvedValue([{ level: "ADMIN", status: "ENABLE" }]);
      mockDb.where
        .mockReturnValueOnce(mockDb)
        .mockReturnValueOnce(mockDb)
        .mockResolvedValueOnce([{ id: TEST_IDS.ID_1 }])
        .mockResolvedValueOnce([{ id: TEST_IDS.ID_2 }]);

      // 设置插入操作的模拟调用。
      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning
        .mockResolvedValueOnce([{ version: 1 }])
        .mockResolvedValueOnce(menuItems);

      const caller = menuRouter.createCaller(
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      const result = await caller.saveAll({
        items: menuItems.map(({ id, type, power }) => ({ id, type, power })),
        expectedVersion: 0,
      });

      expect(result).toEqual({ count: 2, version: 1, publicSync: "completed" });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.menu);
      expect(mockDb.insert).toHaveBeenCalledWith(schema.menu);
    });

    it("rejects empty saves before deleting existing menus", async () => {
      // 设置删除操作的模拟调用。
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = menuRouter.createCaller(
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      await expect(
        caller.saveAll({ items: [], expectedVersion: 0 }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      expect(mockDb.delete).not.toHaveBeenCalled();
    });

    it("should save menu items inside a transaction", async () => {
      const tx = createMockDb();
      const insertError = new Error("insert failed");
      const menuItems = [
        {
          id: TEST_IDS.ID_1,
          parent: null,
          type: MenuType.CATEGORY,
          categoryId: TEST_IDS.ID_1,
          pageId: null,
          customId: null,
          power: 1,
          createdAt: "2026-01-02T03:04:05.000Z",
          updatedAt: null,
        },
      ] satisfies (typeof menu.$inferSelect)[];

      tx.limit.mockResolvedValue([{ level: "ADMIN", status: "ENABLE" }]);
      tx.where
        .mockReturnValueOnce(tx)
        .mockReturnValueOnce(tx)
        .mockResolvedValueOnce([{ id: TEST_IDS.ID_1 }]);
      tx.delete.mockResolvedValueOnce(undefined);
      tx.insert.mockReturnValueOnce(tx);
      tx.values.mockReturnValueOnce(tx);
      tx.returning
        .mockResolvedValueOnce([{ version: 1 }])
        .mockRejectedValueOnce(insertError);
      mockDb.transaction.mockImplementationOnce(
        async (callback: (txDb: typeof tx) => Promise<unknown>) => callback(tx),
      );

      const caller = menuRouter.createCaller(
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      await expect(
        caller.saveAll({
          items: menuItems.map(({ id, type, power }) => ({ id, type, power })),
          expectedVersion: 0,
        }),
      ).rejects.toThrow("insert failed");

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      expect(tx.delete).toHaveBeenCalledWith(schema.menu);
      expect(tx.insert).toHaveBeenCalledWith(schema.menu);
      expect(mockDb.delete).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("should throw FORBIDDEN error for non-admin users", async () => {
      const menuItems = [
        {
          id: TEST_IDS.ID_1,
          parent: null,
          type: MenuType.CATEGORY,
          categoryId: TEST_IDS.ID_1,
          pageId: null,
          customId: null,
          power: 1,
          createdAt: "2026-01-02T03:04:05.000Z",
          updatedAt: null,
        },
      ] satisfies (typeof menu.$inferSelect)[];

      const caller = menuRouter.createCaller(
        createMockContext(createGuestUser(TEST_IDS.ID_2), mockDb),
      );

      await expect(
        caller.saveAll({
          items: menuItems.map(({ id, type, power }) => ({ id, type, power })),
          expectedVersion: 0,
        }),
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should throw UNAUTHORIZED error for unauthenticated users", async () => {
      const menuItems = [
        {
          id: TEST_IDS.ID_1,
          parent: null,
          type: MenuType.CATEGORY,
          categoryId: TEST_IDS.ID_1,
          pageId: null,
          customId: null,
          power: 1,
          createdAt: "2026-01-02T03:04:05.000Z",
          updatedAt: null,
        },
      ] satisfies (typeof menu.$inferSelect)[];

      const caller = menuRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.saveAll({
          items: menuItems.map(({ id, type, power }) => ({ id, type, power })),
          expectedVersion: 0,
        }),
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });
});
