import { describe, it, expect, beforeEach, vi } from "vitest";
import { settingRouter } from "@/features/setting/setting.router";
import { TEST_IDS } from "@tests/helpers/test-constants";
import {
  createAdminUser,
  createGuestUser,
  createMockContext,
  createMockDb,
  resetMockDb,
} from "@tests/helpers/test-utils";

// 模拟数据库及相关模块。
vi.mock("@/packages/infrastructure/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("@/packages/infrastructure/refresh-path", () => ({
  publicContentInvalidator: { invalidate: vi.fn() },
}));

const mockDb = createMockDb();

describe("Setting Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
  });

  describe("index procedure", () => {
    it("should return setting data", async () => {
      const mockSetting = {
        id: TEST_IDS.ID_1,
        siteName: { en: "Site Name", zh: "网站名称" },
        siteSubName: { en: "Sub Name", zh: "副标题" },
        siteSignature: { en: "Signature", zh: "签名" },
        siteCopyright: { en: "Copyright", zh: "版权" },
      };

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([mockSetting]);
      mockDb.where.mockResolvedValueOnce([
        { settingId: TEST_IDS.ID_1, locale: "en", siteName: "Site Name", siteSubName: "Sub Name", siteSignature: "Signature", siteCopyright: "Copyright" },
        { settingId: TEST_IDS.ID_1, locale: "zh", siteName: "网站名称", siteSubName: "副标题", siteSignature: "签名", siteCopyright: "版权" },
      ]);

      const caller = settingRouter.createCaller(
        createMockContext(null, mockDb),
      );

      const result = await caller.index();

      expect(result).toHaveProperty("siteName");
      expect(result).not.toHaveProperty("customObjectId");
    });
  });

  describe("update procedure", () => {
    it("should update setting with admin permissions", async () => {
      const updatedSetting = {
        id: TEST_IDS.ID_1,
        siteName: { en: "Updated Site Name", zh: "更新的网站名称" },
        siteSubName: { en: "Updated Sub Name", zh: "更新的副标题" },
        siteSignature: { en: "Updated Signature", zh: "更新的签名" },
        siteCopyright: { en: "Updated Copyright", zh: "更新的版权" },
      };

      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.limit.mockResolvedValueOnce([{ id: TEST_IDS.ID_1 }]);
      mockDb.where.mockResolvedValueOnce([
        { settingId: TEST_IDS.ID_1, locale: "en", siteName: "Old", siteSubName: "Old", siteSignature: "Old", siteCopyright: "Old" },
        { settingId: TEST_IDS.ID_1, locale: "zh", siteName: "旧", siteSubName: "旧", siteSignature: "旧", siteCopyright: "旧" },
      ]);

      const caller = settingRouter.createCaller(
        createMockContext(createAdminUser(TEST_IDS.ID_1), mockDb),
      );

      const result = await caller.update({
        id: TEST_IDS.ID_1,
        siteName: { en: "Updated Site Name", zh: "更新的网站名称" },
        siteSubName: { en: "Updated Sub Name", zh: "更新的副标题" },
        siteSignature: { en: "Updated Signature", zh: "更新的签名" },
        siteCopyright: { en: "Updated Copyright", zh: "更新的版权" },
      });

      expect(result).toEqual(updatedSetting);
    });

    it("should throw error for non-admin users", async () => {
      const caller = settingRouter.createCaller(
        createMockContext(createGuestUser(TEST_IDS.ID_2), mockDb),
      );

      await expect(
        caller.update({
          id: TEST_IDS.ID_1,
          siteName: { en: "Updated Site Name", zh: "更新的网站名称" },
          siteSubName: { en: "Updated Sub Name", zh: "更新的副标题" },
          siteSignature: { en: "Updated Signature", zh: "更新的签名" },
          siteCopyright: { en: "Updated Copyright", zh: "更新的版权" },
        }),
      ).rejects.toThrow();
    });
  });
});
