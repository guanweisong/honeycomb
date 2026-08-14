import { describe, it, expect, beforeEach, vi } from "vitest";
import { menuRouter } from "./menu.router";
import * as schema from "@/packages/infrastructure/db/schema";
import { MenuType } from "@/packages/domain/navigation/menu";
import { UserLevel } from "@/packages/domain/identity/user";
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
          type: MenuType.CATEGORY,
          categoryId: TEST_IDS.ID_1,
          pageId: null,
          customId: null,
          power: 1,
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          type: MenuType.PAGE,
          categoryId: null,
          pageId: TEST_IDS.ID_2,
          customId: null,
          power: 2,
          createdAt: new Date(),
        },
      ];

      // 设置删除操作的模拟调用。
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      // 设置插入操作的模拟调用。
      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce(menuItems);

      const caller = menuRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

      const result = await caller.saveAll(menuItems);

      expect(result).toEqual({ count: 2 });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.menu);
      expect(mockDb.insert).toHaveBeenCalledWith(schema.menu);
    });

    it("should return 0 count for empty input", async () => {
      // 设置删除操作的模拟调用。
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = menuRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

      const result = await caller.saveAll([]);

      expect(result).toEqual({ count: 0 });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.menu);
    });

    it("should save menu items inside a transaction", async () => {
      const tx = createMockDb();
      const insertError = new Error("insert failed");
      const menuItems = [
        {
          id: TEST_IDS.ID_1,
          type: MenuType.CATEGORY,
          categoryId: TEST_IDS.ID_1,
          pageId: null,
          customId: null,
          power: 1,
          createdAt: new Date(),
        },
      ];

      tx.delete.mockResolvedValueOnce(undefined);
      tx.insert.mockReturnValueOnce(tx);
      tx.values.mockReturnValueOnce(tx);
      tx.returning.mockRejectedValueOnce(insertError);
      mockDb.transaction.mockImplementationOnce(
        async (callback: (txDb: typeof tx) => Promise<unknown>) => callback(tx),
      );

      const caller = menuRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
          mockDb,
        ),
      );

      await expect(caller.saveAll(menuItems)).rejects.toThrow("insert failed");

      expect(mockDb.transaction).toHaveBeenCalledTimes(1);
      expect(tx.delete).toHaveBeenCalledWith(schema.menu);
      expect(tx.insert).toHaveBeenCalledWith(schema.menu);
      expect(mockDb.delete).not.toHaveBeenCalled();
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const menuItems = [
        {
          id: TEST_IDS.ID_1,
          type: MenuType.CATEGORY,
          categoryId: TEST_IDS.ID_1,
          pageId: null,
          customId: null,
          power: 1,
          createdAt: new Date(),
        },
      ];

      const caller = menuRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_2, level: UserLevel.GUEST },
          mockDb,
        ),
      );

      await expect(caller.saveAll(menuItems)).rejects.toThrow("FORBIDDEN");
    });

    it("should throw UNAUTHORIZED error for unauthenticated users", async () => {
      const menuItems = [
        {
          id: TEST_IDS.ID_1,
          type: MenuType.CATEGORY,
          categoryId: TEST_IDS.ID_1,
          pageId: null,
          customId: null,
          power: 1,
          createdAt: new Date(),
        },
      ];

      const caller = menuRouter.createCaller(createMockContext(null, mockDb));

      await expect(caller.saveAll(menuItems)).rejects.toThrow("UNAUTHORIZED");
    });
  });
});
