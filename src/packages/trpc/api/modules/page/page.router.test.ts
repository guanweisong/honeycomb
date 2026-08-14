import { describe, it, expect, beforeEach, vi } from "vitest";
import { pageRouter } from "./page.router";
import * as schema from "@/packages/infrastructure/db/schema";
import { UserLevel } from "@/packages/domain/identity/user";
import { PageTemplate } from "@/packages/domain/content/page-template";
import { TEST_IDS } from "@tests/helpers/test-constants";
import { createMockContext, createMockDb, resetMockDb } from "@tests/helpers/test-utils";

// 模拟数据库及相关模块。
vi.mock("@/packages/infrastructure/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("Page Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
  });

  describe("create procedure", () => {
    it("should create page with admin permissions", async () => {
      const newPage = {
        id: TEST_IDS.ID_3,
        title: { en: "New Page", zh: "新页面" },
        content: { en: "New Content", zh: "新内容" },
        status: "PUBLISH",
        template: PageTemplate.DEFAULT,
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([newPage]);

      const caller = pageRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.create({
        title: { en: "New Page", zh: "新页面" },
        content: { en: "New Content", zh: "新内容" },
        status: "PUBLISH",
        template: PageTemplate.DEFAULT,
      });

      expect(result).toEqual(newPage);
      expect(mockDb.insert).toHaveBeenCalledWith(schema.page);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = pageRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

        await expect(
      caller.create({
        title: { en: "New Page", zh: "新页面" },
        content: { en: "New Content", zh: "新内容" },
        status: "PUBLISH",
        template: PageTemplate.DEFAULT,
      }),
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should throw UNAUTHORIZED error for unauthenticated users", async () => {
      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

        await expect(
      caller.create({
        title: { en: "New Page", zh: "新页面" },
        content: { en: "New Content", zh: "新内容" },
        status: "PUBLISH",
        template: PageTemplate.DEFAULT,
      }),
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("destroy procedure", () => {
    it("should delete pages with admin permissions", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ id: TEST_IDS.ID_1 }]);
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = pageRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.destroy({
        ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
      });

      expect(result).toEqual({ success: true });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.page);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = pageRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.destroy({
          ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
        }),
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("update procedure", () => {
    it("should update page with admin permissions", async () => {
      const updatedPage = {
        id: TEST_IDS.ID_1,
        title: { en: "Updated Page", zh: "更新的页面" },
        content: { en: "Updated Content", zh: "更新的内容" },
        status: "PUBLISH",
        template: PageTemplate.DEFAULT,
        author: null,
      };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedPage]);

      const caller = pageRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.update({
        id: TEST_IDS.ID_1,
        title: { en: "Updated Page", zh: "更新的页面" },
        content: { en: "Updated Content", zh: "更新的内容" },
        status: "PUBLISH",
        template: PageTemplate.DEFAULT,
      });

      expect(result).toEqual(updatedPage);
      expect(mockDb.update).toHaveBeenCalledWith(schema.page);
    });

    it("should throw UNAUTHORIZED error for non-admin users", async () => {
      const caller = pageRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

        await expect(
      caller.update({
        id: TEST_IDS.ID_1,
        title: { en: "Updated Page", zh: "更新的页面" },
        content: { en: "Updated Content", zh: "更新的内容" },
        status: "PUBLISH",
        template: PageTemplate.DEFAULT,
      }),
      ).rejects.toThrow("FORBIDDEN");
    });
  });
});
