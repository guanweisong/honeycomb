import { describe, expect, it } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { listPages } from "./page-queries";
import { PageTemplate } from "@/features/page/types/page.template";
import * as schema from "@/lib/db/schema";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { PageStatus } from "@/features/page/types/page.status";
const row = {
  id: "507f1f77bcf86cd799439011",
  authorId: "author",
  version: 0,
  status: PageStatus.DRAFT,
  template: PageTemplate.DEFAULT,
  views: 0,
  createdAt: null,
  updatedAt: null,
};
describe("page relation read snapshot", () => {
  it("gets revision and translations from the same reread and drops disappeared rows", async () => {
    const fake = createMockDb();
    fake.offset.mockResolvedValue([
      { id: row.id },
      { id: "507f1f77bcf86cd799439012" },
    ]);
    fake.where.mockReturnValueOnce(fake).mockResolvedValueOnce([{ count: 2 }]);
    fake.query.page.findMany.mockResolvedValue([
      {
        ...row,
        version: 2,
        creationToken: "private",
        creationInputHash: "private",
        author: null,
        translations: [
          { pageId: row.id, locale: "en", title: "current", content: "body" },
          { pageId: row.id, locale: "zh", title: "当前", content: "正文" },
        ],
      },
    ]);
    const result = await listPages(asMockDatabase(fake), {}, "ALL");
    expect(fake.select).toHaveBeenNthCalledWith(1, { id: schema.page.id });
    expect(result.list).toHaveLength(1);
    expect(result.list[0]).toMatchObject({
      id: row.id,
      version: 2,
      title: { en: "current", zh: "当前" },
      content: { en: "body", zh: "正文" },
    });
    expect(result.list[0]).not.toHaveProperty("creationToken");
    expect(result.list[0]).not.toHaveProperty("creationInputHash");
  });
  it("preserves paginated ID order and rechecks published visibility", async () => {
    const fake = createMockDb();
    const otherId = "507f1f77bcf86cd799439012";
    fake.offset.mockResolvedValue([{ id: otherId }, { id: row.id }]);
    fake.where.mockReturnValueOnce(fake).mockResolvedValueOnce([{ count: 2 }]);
    fake.query.page.findMany.mockResolvedValue(
      [row.id, otherId].map((id) => ({
        ...row,
        id,
        status: PageStatus.PUBLISHED,
        author: null,
        translations: [],
      })),
    );
    const result = await listPages(
      asMockDatabase(fake),
      { page: 3, limit: 2 },
      "PUBLISHED_ONLY",
    );
    expect(result.list.map((page) => page.id)).toEqual([otherId, row.id]);
    expect(fake.limit).toHaveBeenCalledWith(2);
    expect(fake.offset).toHaveBeenCalledWith(4);
    const dialect = new SQLiteSyncDialect();
    expect(dialect.sqlToQuery(fake.where.mock.calls[0]?.[0]).params).toContain(
      PageStatus.PUBLISHED,
    );
    expect(
      dialect.sqlToQuery(fake.query.page.findMany.mock.calls[0]?.[0].where)
        .params,
    ).toContain(PageStatus.PUBLISHED);
  });
  it.each(["status", "template"] as const)(
    "still validates the hydrated %s enum",
    async (field) => {
      const fake = createMockDb();
      fake.offset.mockResolvedValue([{ id: row.id }]);
      fake.where
        .mockReturnValueOnce(fake)
        .mockResolvedValueOnce([{ count: 1 }]);
      fake.query.page.findMany.mockResolvedValue([
        {
          ...row,
          [field]: "INVALID",
          author: null,
          translations: [],
        },
      ]);
      await expect(listPages(asMockDatabase(fake), {}, "ALL")).rejects.toThrow(
        `page.${field}`,
      );
    },
  );
});
