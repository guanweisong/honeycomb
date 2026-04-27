import { describe, it, expect, beforeEach, vi } from "vitest";
import { settingRouter } from "./setting.router";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { TEST_IDS } from "../../../../../../tests/helpers/test-constants";
import { createMockContext, createMockDb } from "../../../../../../tests/helpers/test-utils";

// Mock database and related modules
vi.mock("@/packages/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("Setting Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      mockDb.from.mockResolvedValueOnce([mockSetting]);

      const caller = settingRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index();

      expect(result).toHaveProperty("siteName");
      expect(result).toHaveProperty("customObjectId");
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

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedSetting]);

      const caller = settingRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

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
      const caller = settingRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

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
