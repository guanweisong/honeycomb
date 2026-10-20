import { describe, it, expect, beforeEach, vi } from "vitest";
import { pageRouter } from "@/features/page/router";
import * as schema from "@/lib/db/schema";
import { UserLevel } from "@/features/user/user";
import { PageStatus } from "@/features/page/page-status";
import { PageTemplate } from "@/features/page/page-template";
import { MultiLangEnum } from "@/lib/i18n/i18n";
import type { MediaRecord } from "@/features/media/types";
import { TEST_IDS } from "@tests/helpers/test-constants";
import {
  createGuestUser,
  createMockContext,
  createMockDb,
  resetMockDb,
} from "@tests/helpers/test-utils";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

// 模拟数据库及相关模块。
vi.mock("@/lib/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

const mockDb = createMockDb();

describe("Page Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockDb(mockDb);
  });

  describe("public media serialization", () => {
    const publicImages = [
      {
        id: TEST_IDS.ID_2,
        key: "images/first.png",
        name: "first.png",
        size: 123,
        type: "image/png",
        url: "https://example.com/first.png",
        color: "#ffffff",
        height: 100,
        width: 200,
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-02T00:00:00.000Z",
      },
      {
        id: TEST_IDS.ID_3,
        key: "images/second.png",
        name: "second.png",
        size: 456,
        type: "image/png",
        url: "https://example.com/second.png",
        color: null,
        height: null,
        width: null,
        createdAt: null,
        updatedAt: null,
      },
    ] satisfies MediaRecord[];
    const mediaRows = publicImages.map((image) => ({
      ...image,
      ...({
        state: "READY",
        uploadKey: "private-upload-key-sentinel",
        uploadedBy: "private-uploader-sentinel",
        uploadExpiresAt: "2026-10-03T00:00:00.000Z",
        copyStartedAt: "2026-10-04T00:00:00.000Z",
        verifiedAt: "2026-10-05T00:00:00.000Z",
        lastAttemptAt: "2026-10-06T00:00:00.000Z",
        lastErrorCode: "STORAGE_PENDING",
      } satisfies Omit<typeof schema.media.$inferSelect, keyof typeof image>),
      futureInternalField: "private-future-field-sentinel",
    }));
    const pageRow = {
      id: TEST_IDS.ID_1,
      authorId: TEST_IDS.ID_2,
      version: 2,
      status: PageStatus.PUBLISHED,
      template: PageTemplate.DEFAULT,
      views: 0,
      createdAt: null,
      updatedAt: null,
      creationToken: "private-page-token",
      creationInputHash: "private-page-hash",
    } satisfies typeof schema.page.$inferSelect;
    const translations = [
      {
        pageId: pageRow.id,
        locale: MultiLangEnum.Zh,
        title: "页面",
        content:
          '<img src="https://example.com/second.png"><img src="https://example.com/first.png"><img src="https://example.com/second.png"><img src="https://example.com/missing.png">',
      },
      {
        pageId: pageRow.id,
        locale: MultiLangEnum.En,
        title: "Page",
        content: '<img src="https://example.com/first.png">',
      },
    ] satisfies (typeof schema.pageTranslation.$inferSelect)[];

    it.each(["index", "detail"] as const)(
      "%s exposes only public media fields to anonymous callers",
      async (procedure) => {
        const relatedPage = { ...pageRow, author: null, translations };
        if (procedure === "index") {
          mockDb.offset.mockResolvedValueOnce([{ id: pageRow.id }]);
          mockDb.where
            .mockReturnValueOnce(mockDb)
            .mockResolvedValueOnce([{ count: 1 }]);
          mockDb.query.page.findMany.mockResolvedValueOnce([relatedPage]);
        } else {
          mockDb.query.page.findFirst.mockResolvedValueOnce(relatedPage);
        }
        mockDb.where.mockResolvedValueOnce([...mediaRows, mediaRows[0]]);
        const caller = pageRouter.createCaller(createMockContext(null, mockDb));
        const page =
          procedure === "index"
            ? (await caller.index({ page: 1, limit: 10 })).list[0]
            : await caller.detail({ id: pageRow.id });
        expect(page).toBeDefined();
        const serializedImages: unknown = JSON.parse(
          JSON.stringify(page?.imagesInContent),
        );
        // The list follows localized content order; detail retains DB order.
        // Exact equality also rejects future internal columns, not just known ones.
        expect(serializedImages).toEqual(
          procedure === "index"
            ? [publicImages[1], publicImages[0]]
            : publicImages,
        );
      },
    );
  });

  describe("index procedure", () => {
    it("rejects unauthenticated callers from adminIndex", async () => {
      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      await expect(caller.adminIndex({ page: 1, limit: 10 })).rejects.toThrow(
        "UNAUTHORIZED",
      );
    });

    it("should return page list with pagination", async () => {
      const mockPages = [
        {
          id: TEST_IDS.ID_1,
          title: { en: "Page 1", zh: "页面1" },
          content: { en: "Content 1", zh: "内容1" },
          status: PageStatus.PUBLISHED,
          template: PageTemplate.DEFAULT,
          author: null,
          createdAt: new Date(),
        },
        {
          id: TEST_IDS.ID_2,
          title: { en: "Page 2", zh: "页面2" },
          content: { en: "Content 2", zh: "内容2" },
          status: PageStatus.PUBLISHED,
          template: PageTemplate.DEFAULT,
          author: null,
          createdAt: new Date(),
        },
      ];
      const mockCount = [{ count: "2" }];

      // 设置页面列表查询的模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockPages);

      mockDb.query.page.findMany.mockResolvedValueOnce(
        mockPages.map(({ title, content, ...page }) => ({
          ...page,
          translations: [
            {
              pageId: page.id,
              locale: "en",
              title: title.en,
              content: content.en,
            },
            {
              pageId: page.id,
              locale: "zh",
              title: title.zh,
              content: content.zh,
            },
          ],
        })),
      );

      // 设置总数查询的模拟调用。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: mockPages.map((page) => ({ ...page, imagesInContent: [] })),
        total: 2,
      });
    });

    it("should handle empty page list", async () => {
      const mockPages: unknown[] = [];
      const mockCount = [{ count: "0" }];

      // 设置空页面列表查询的模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.orderBy.mockReturnValueOnce(mockDb);
      mockDb.limit.mockReturnValueOnce(mockDb);
      mockDb.offset.mockResolvedValueOnce(mockPages);

      mockDb.query.page.findMany.mockResolvedValueOnce(mockPages);

      // 设置总数查询的模拟调用。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockCount);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.index({ page: 1, limit: 10 });

      expect(result).toEqual({
        list: [],
        total: 0,
      });
    });
  });

  describe("detail procedure", () => {
    it("allows guest callers to read adminDetail", async () => {
      mockDb.query.page.findFirst.mockResolvedValueOnce({
        id: TEST_IDS.ID_1,
        status: PageStatus.DRAFT,
        template: PageTemplate.DEFAULT,
        author: null,
        translations: [
          {
            pageId: TEST_IDS.ID_1,
            locale: "en",
            title: "Page 1",
            content: "Content 1",
          },
          {
            pageId: TEST_IDS.ID_1,
            locale: "zh",
            title: "页面1",
            content: "内容1",
          },
        ],
      });

      const caller = pageRouter.createCaller(
        createMockContext(
          { id: TEST_IDS.ID_2, level: UserLevel.GUEST },
          mockDb,
        ),
      );

      const result = await caller.adminDetail({ id: TEST_IDS.ID_1 });

      expect(result?.id).toBe(TEST_IDS.ID_1);
    });
  });

  describe("detail procedure", () => {
    it("should return page details with author info", async () => {
      const mockAuthor = { id: TEST_IDS.ID_1, name: "Test Author" };
      const mockPage = {
        id: TEST_IDS.ID_1,
        title: { en: "Page 1", zh: "页面1" },
        content: { en: "Content 1", zh: "内容1" },
        status: PageStatus.PUBLISHED,
        template: PageTemplate.DEFAULT,
        authorId: TEST_IDS.ID_1,
        createdAt: new Date(),
      };
      const mockImages = [
        { id: "img1", url: "https://example.com/img1.jpg" },
        { id: "img2", url: "https://example.com/img2.jpg" },
      ];

      // 设置页面详情查询的模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([mockPage]);

      mockDb.query.page.findFirst.mockResolvedValueOnce({
        ...mockPage,
        translations: [
          {
            pageId: mockPage.id,
            locale: "en",
            title: mockPage.title.en,
            content: mockPage.content.en,
          },
          {
            pageId: mockPage.id,
            locale: "zh",
            title: mockPage.title.zh,
            content: mockPage.content.zh,
          },
        ],
        author: mockAuthor,
      });

      // 设置作者查询的模拟调用。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([mockAuthor]);

      // 设置图片查询的模拟调用。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce(mockImages);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.detail({ id: TEST_IDS.ID_1 });

      expect(result).toEqual({
        ...mockPage,
        author: mockAuthor,
        imagesInContent: [],
      });
    });

    it("should return null for non-existent page", async () => {
      // 设置不存在页面查询的模拟调用链。
      mockDb.select.mockReturnValueOnce(mockDb);
      mockDb.from.mockReturnValueOnce(mockDb);
      mockDb.where.mockResolvedValueOnce([]);

      mockDb.query.page.findFirst.mockResolvedValueOnce(null);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.detail({ id: TEST_IDS.ID_NOT_FOUND });

      expect(result).toBeNull();
    });
  });

  describe("incrementViews procedure", () => {
    it("should increment page views", async () => {
      const updatedViews = { views: 101 };

      // 设置增加浏览量查询的模拟调用链。
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedViews]);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.incrementViews({ id: TEST_IDS.ID_1 });

      expect(result).toEqual(updatedViews);
      expect(mockDb.update).toHaveBeenCalledWith(schema.page);
      const where = mockDb.where.mock.calls[0]?.[0];
      expect(new SQLiteSyncDialect().sqlToQuery(where).params).toContain(
        PageStatus.PUBLISHED,
      );
    });

    it("returns NOT_FOUND when no published page is updated", async () => {
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([]);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      await expect(
        caller.incrementViews({ id: TEST_IDS.ID_NOT_FOUND }),
      ).rejects.toThrow("NOT_FOUND");
    });

    it("should increment views for any user", async () => {
      const updatedViews = { views: 101 };

      // 设置增加浏览量查询的模拟调用链。
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedViews]);

      const caller = pageRouter.createCaller(
        createMockContext(createGuestUser(TEST_IDS.ID_2), mockDb),
      );

      const result = await caller.incrementViews({ id: TEST_IDS.ID_1 });

      expect(result).toEqual(updatedViews);
      expect(mockDb.update).toHaveBeenCalledWith(schema.page);
    });

    it("should increment views for unauthenticated users", async () => {
      const updatedViews = { views: 101 };

      // 设置增加浏览量查询的模拟调用链。
      mockDb.update.mockReturnValueOnce(mockDb);
      mockDb.set.mockReturnValueOnce(mockDb);
      mockDb.where.mockReturnValueOnce(mockDb);
      mockDb.returning.mockResolvedValueOnce([updatedViews]);

      const caller = pageRouter.createCaller(createMockContext(null, mockDb));

      const result = await caller.incrementViews({ id: TEST_IDS.ID_1 });

      expect(result).toEqual(updatedViews);
      expect(mockDb.update).toHaveBeenCalledWith(schema.page);
    });
  });
});
