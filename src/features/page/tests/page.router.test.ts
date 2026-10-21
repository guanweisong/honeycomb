import { describe, it, expect, beforeEach, vi } from "vitest";
import { pageRouter } from "@/features/page/router";
import * as schema from "@/lib/db/schema";
import { UserLevel, UserStatus } from "@/features/user/user";
import { PageTemplate } from "@/features/page/page-template";
import { PageStatus } from "@/features/page/page-status";
import { TEST_IDS } from "@tests/helpers/test-constants";
import {
  createAdminUser,
  createGuestUser,
  createMockContext,
  createMockDb,
  resetMockDb,
} from "@tests/helpers/test-utils";

const mockInvalidatePublicContent = vi.hoisted(() => vi.fn());

vi.mock("@/lib/cache/refresh-path", () => ({
  publicContentInvalidator: {
    invalidate: (...args: unknown[]) => mockInvalidatePublicContent(...args),
  },
}));

// 模拟数据库及相关模块。
vi.mock("@/lib/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("Page Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvalidatePublicContent.mockResolvedValue({ state: "completed" });
    resetMockDb(mockDb);
    mockDb.from.mockImplementation((table: object) => {
      if (table === schema.user) {
        const actor = createMockDb();
        actor.limit.mockResolvedValue([
          { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
        ]);
        return actor;
      }
      if (table === schema.pageTranslation) {
        const translations = createMockDb();
        translations.where.mockResolvedValue([]);
        return translations;
      }
      if (table === schema.menu) {
        const menu = createMockDb();
        menu.limit.mockResolvedValue([]);
        return menu;
      }
      return mockDb;
    });
  });

  describe("create procedure", () => {
    it("should create page with admin permissions", async () => {
      const newPage = {
        id: TEST_IDS.ID_3,
        version: 0,
        title: { en: "New Page", zh: "新页面" },
        content: { en: "New Content", zh: "新内容" },
        status: PageStatus.PUBLISHED,
        template: PageTemplate.DEFAULT,
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([newPage]);

      const caller = pageRouter.createCaller(
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      const result = await caller.create({
        creationToken: "11111111-1111-4111-8111-111111111111",
        title: { en: "New Page", zh: "新页面" },
        content: { en: "New Content", zh: "新内容" },
        status: PageStatus.PUBLISHED,
        template: PageTemplate.DEFAULT,
      });

      expect(result).toEqual({
        id: newPage.id,
        version: 0,
        publicSync: "completed",
      });
      expect(mockDb.insert).toHaveBeenCalledWith(schema.page);
    });

    it("should throw FORBIDDEN error for non-admin users", async () => {
      const caller = pageRouter.createCaller(
        createMockContext(createGuestUser(TEST_IDS.ID_2), mockDb),
      );

      await expect(
        caller.create({
          creationToken: "11111111-1111-4111-8111-111111111111",
          title: { en: "New Page", zh: "新页面" },
          content: { en: "New Content", zh: "新内容" },
          status: PageStatus.PUBLISHED,
          template: PageTemplate.DEFAULT,
        }),
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should throw UNAUTHORIZED error for unauthenticated users", async () => {
      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.create({
          creationToken: "11111111-1111-4111-8111-111111111111",
          title: { en: "New Page", zh: "新页面" },
          content: { en: "New Content", zh: "新内容" },
          status: PageStatus.PUBLISHED,
          template: PageTemplate.DEFAULT,
        }),
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("destroy procedure", () => {
    it("should delete pages with admin permissions", async () => {
      mockDb.limit.mockResolvedValue([{ version: 0 }]);
      mockDb.returning.mockResolvedValue([{ id: TEST_IDS.ID_1 }]);

      const caller = pageRouter.createCaller(
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      const result = await caller.destroy({
        items: [TEST_IDS.ID_1, TEST_IDS.ID_2].map((id) => ({
          id,
          expectedVersion: 0,
        })),
      });

      expect(result).toEqual({ success: true, publicSync: "completed" });
      expect(mockDb.delete).toHaveBeenCalledWith(schema.page);
    });

    it("should throw FORBIDDEN error for non-admin users", async () => {
      const caller = pageRouter.createCaller(
        createMockContext(createGuestUser(TEST_IDS.ID_2), mockDb),
      );

      await expect(
        caller.destroy({
          items: [TEST_IDS.ID_1, TEST_IDS.ID_2].map((id) => ({
            id,
            expectedVersion: 0,
          })),
        }),
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("update procedure", () => {
    it("should update page with admin permissions", async () => {
      const updatedPage = {
        id: TEST_IDS.ID_1,
        version: 1,
        title: { en: "Updated Page", zh: "更新的页面" },
        content: { en: "Updated Content", zh: "更新的内容" },
        status: "PUBLISHED",
        template: PageTemplate.DEFAULT,
        author: null,
      };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedPage]);

      const caller = pageRouter.createCaller(
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([
        { status: PageStatus.DRAFT, version: 0 },
      ]);
      const result = await caller.update({
        expectedVersion: 0,
        id: TEST_IDS.ID_1,
        title: { en: "Updated Page", zh: "更新的页面" },
        content: { en: "Updated Content", zh: "更新的内容" },
        status: PageStatus.PUBLISHED,
        template: PageTemplate.DEFAULT,
      });

      expect(result).toEqual({
        id: updatedPage.id,
        version: 1,
        publicSync: "completed",
      });
      expect(mockDb.update).toHaveBeenCalledWith(schema.page);
      expect(mockInvalidatePublicContent).toHaveBeenCalledWith({
        contents: [{ id: TEST_IDS.ID_1, type: "page" }],
        refreshLayout: true,
        refreshSitemap: true,
      });
    });

    it("should throw FORBIDDEN error for non-admin users", async () => {
      const caller = pageRouter.createCaller(
        createMockContext(createGuestUser(TEST_IDS.ID_2), mockDb),
      );

      await expect(
        caller.update({
          expectedVersion: 0,
          id: TEST_IDS.ID_1,
          title: { en: "Updated Page", zh: "更新的页面" },
          content: { en: "Updated Content", zh: "更新的内容" },
          status: PageStatus.PUBLISHED,
          template: PageTemplate.DEFAULT,
        }),
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("incrementViews procedure", () => {
    it("returns the latest count without invalidating the static route", async () => {
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([{ views: 4 }]);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.incrementViews({ id: TEST_IDS.ID_1 }),
      ).resolves.toEqual({
        views: 4,
      });
      expect(mockInvalidatePublicContent).not.toHaveBeenCalled();
    });
  });
});
