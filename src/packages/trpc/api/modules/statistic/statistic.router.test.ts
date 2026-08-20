import { describe, it, expect, beforeEach, vi } from "vitest";
import { statisticRouter } from "@/features/setting/statistic.router";
import { UserLevel } from "@/packages/domain/identity/user";
import { createMockContext, createMockDb } from "@tests/helpers/test-utils";

// 模拟数据库及相关模块。
vi.mock("@/packages/infrastructure/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("Statistic Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("index procedure", () => {
    it("should return statistics with admin permissions", async () => {
      // 使用简化模拟，为所有查询返回空数组。
      mockDb.select.mockReturnValue(mockDb);
      mockDb.select.mockImplementation((selection) => {
        if (selection?.id && selection?.name) {
          return { from: vi.fn().mockResolvedValue([]) };
        }
        return mockDb;
      });
      mockDb.from.mockReturnValue(mockDb);
      mockDb.where.mockReturnValue(mockDb);
      mockDb.where.mockResolvedValue([{ count: "0" }]);
      mockDb.groupBy.mockResolvedValue([]);

      const caller = statisticRouter.createCaller(
        createMockContext({ id: "1", level: UserLevel.ADMIN }, mockDb),
      );

      const result = await caller.index();

      expect(result).toHaveProperty("postType");
      expect(result).toHaveProperty("userType");
      expect(result).toHaveProperty("commentStatus");
      expect(result).toHaveProperty("userPost");
    });

    it("should throw error for non-authenticated users", async () => {
      const caller = statisticRouter.createCaller(
        createMockContext(null, mockDb),
      );

      await expect(caller.index()).rejects.toThrow();
    });
  });
});
