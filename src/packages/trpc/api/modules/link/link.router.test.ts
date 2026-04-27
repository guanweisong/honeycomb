import { describe, it, expect, beforeEach, vi } from "vitest";
import { linkRouter } from "./link.router";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";
import { UserStatus } from "@/packages/trpc/api/modules/user/types/user.status";
import { TEST_IDS } from "../../../../../../tests/helpers/test-constants";
import { createMockContext, createMockDb } from "../../../../../../tests/helpers/test-utils";

// Mock database and related modules
vi.mock("@/packages/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("@/packages/trpc/api/utils/tools", () => ({
  buildDrizzleWhere: vi.fn(() => ({})),
  buildDrizzleOrderBy: vi.fn(() => ({})),
}));

const mockDb = createMockDb();

describe("Link Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("index procedure", () => {
    it("should return link list", async () => {
      const mockLinks = [
        {
          id: TEST_IDS.ID_1,
          name: "Link 1",
          url: "https://example1.com",
          logo: "https://example1.com/logo.png",
          status: true,
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          name: "Link 2",
          url: "https://example2.com",
          logo: "https://example2.com/logo.png",
          status: true,
          createdAt: new Date(),
        },
      ];
      const mockCount = [{ count: "2" }];

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockLinks);

      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);

      const caller = linkRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: mockLinks,
        total: 2,
      });
    });
  });

  describe("create procedure", () => {
    it("should create link with admin permissions", async () => {
      const newLink = {
        id: TEST_IDS.ID_3,
        name: "New Link",
        url: "https://example3.com",
        status: true,
      };

      mockDb.insert.mockReturnValueOnce(mockDb);
      mockDb.values.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([newLink]);

      const caller = linkRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.create({
        name: "New Link",
        url: "https://example3.com",
        logo: "https://example3.com/logo.png",
        status: UserStatus.ENABLE,
      });

      expect(result).toEqual(newLink);
    });
  });

  describe("destroy procedure", () => {
    it("should delete links with admin permissions", async () => {
      mockDb.delete.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(undefined);

      const caller = linkRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.destroy({
        ids: [TEST_IDS.ID_1, TEST_IDS.ID_2],
      });

      expect(result).toEqual({ success: true });
    });
  });

  describe("update procedure", () => {
    it("should update link with admin permissions", async () => {
      const updatedLink = {
        id: TEST_IDS.ID_1,
        name: "Updated Link",
        url: "https://example-updated.com",
        status: true,
      };

      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedLink]);

      const caller = linkRouter.createCaller(createMockContext({ id: TEST_IDS.ID_1, level: UserLevel.ADMIN }, mockDb));

      const result = await caller.update({
        id: TEST_IDS.ID_1,
        name: "Updated Link",
        url: "https://example-updated.com",
        logo: "https://example-updated.com/logo.png",
        status: UserStatus.ENABLE,
      });

      expect(result).toEqual(updatedLink);
    });

    it("should throw error for non-admin users", async () => {
      const caller = linkRouter.createCaller(createMockContext({ id: TEST_IDS.ID_2, level: UserLevel.GUEST }, mockDb));

      await expect(
        caller.update({
          id: TEST_IDS.ID_1,
          name: "Updated Link",
          url: "https://example-updated.com",
          logo: "https://example-updated.com/logo.png",
          status: UserStatus.ENABLE,
        }),
      ).rejects.toThrow();
    });
  });
});
