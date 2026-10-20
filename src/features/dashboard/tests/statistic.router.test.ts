import { describe, it, expect, beforeEach, vi } from "vitest";
import { UserLevel } from "@/features/user/user";
import { statisticRouter } from "@/features/dashboard/router";
import { createMockContext, createMockDb } from "@tests/helpers/test-utils";

// 模拟数据库及相关模块。
vi.mock("@/lib/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("Statistic Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("index procedure", () => {
    it.each([UserLevel.ADMIN, UserLevel.EDITOR, UserLevel.GUEST])(
      "should preserve statistics permission for %s",
      async (level) => {
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
          createMockContext({ id: "1", level }, mockDb),
        );

        const result = await caller.index();

        expect(result).toHaveProperty("postType");
        expect(result).toHaveProperty("userType");
        expect(result).toHaveProperty("commentStatus");
        expect(result).toHaveProperty("userPost");
      },
    );

    it("should throw error for non-authenticated users", async () => {
      const caller = statisticRouter.createCaller(
        createMockContext(null, mockDb),
      );

      await expect(caller.index()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });
});
