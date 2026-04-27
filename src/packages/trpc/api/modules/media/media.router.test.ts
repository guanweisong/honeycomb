import { describe, it, expect, beforeEach, vi } from "vitest";
import { mediaRouter } from "./media.router";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { TEST_IDS } from "../../../../../../tests/helpers/test-constants";
import { createMockContext, createMockDb } from "../../../../../../tests/helpers/test-utils";

// Mock database and related modules
vi.mock("@/packages/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

// Mock S3 module
vi.mock("@/packages/trpc/api/utils/S3", () => ({
  default: {
    getPresignedUrl: vi
      .fn()
      .mockResolvedValue("https://example.com/presigned-url"),
    deleteMultipleObject: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockDb = createMockDb();

describe("Media Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("index procedure", () => {
    it("should create caller successfully", async () => {
      const caller = mediaRouter.createCaller(createMockContext(null, mockDb));

      expect(caller).toBeDefined();
      expect(typeof caller.index).toBe("function");
    });
  });

  describe("getPresignedUrl procedure", () => {
    it("should return presigned URL with admin permissions", async () => {
      const caller = mediaRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.getPresignedUrl({
        name: "test.jpg",
        type: "image/jpeg",
      });

      expect(result).toEqual({
        url: "https://example.com/presigned-url",
        key: expect.any(String),
      });
    });

    it("should throw error for non-admin users", async () => {
      const caller = mediaRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.getPresignedUrl({
          name: "test.jpg",
          type: "image/jpeg",
        }),
      ).rejects.toThrow();
    });
  });

  describe("upload procedure", () => {
    it("should upload media with admin permissions", async () => {
      const mockMedia = {
        id: TEST_IDS.ID_1,
        name: "test.jpg",
        url: "https://example.com/test.jpg",
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([mockMedia]);

      const caller = mediaRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.upload({
        name: "test.jpg",
        size: 1024,
        type: "image/jpeg",
        key: "2024/01/01/test.jpg",
      });

      expect(result).toEqual(mockMedia);
    });

    it("should throw error for non-admin users", async () => {
      const caller = mediaRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.upload({
          name: "test.jpg",
          size: 1024,
          type: "image/jpeg",
          key: "2024/01/01/test.jpg",
        }),
      ).rejects.toThrow();
    });
  });

  describe("destroy procedure", () => {
    it("should delete media with admin permissions", async () => {
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([{ key: "test.jpg" }]);

      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = mediaRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.destroy({ ids: [TEST_IDS.ID_1] });

      expect(result).toEqual({ success: true });
    });

    it("should throw error for non-admin users", async () => {
      const caller = mediaRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(caller.destroy({ ids: [TEST_IDS.ID_1] })).rejects.toThrow();
    });
  });
});
