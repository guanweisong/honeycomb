import { beforeEach, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { PageStatus } from "@/features/page/types/page.status";
import { PageTemplate } from "@/features/page/types/page.template";
import * as queries from "./page-queries";
vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));
const db = createMockDb();
const row = {
  id: "page-1",
  version: 7,
  authorId: "author-1",
  views: 9,
  status: PageStatus.DRAFT,
  template: PageTemplate.DEFAULT,
  createdAt: "2026-10-01T00:00:00Z",
  updatedAt: null,
  creationToken: "secret-token",
  creationInputHash: "secret-hash",
  author: { id: "author-1", name: "Author" },
  translations: [
    {
      pageId: "page-1",
      locale: "en",
      title: "About",
      content: '<img src="https://cdn.test/image.jpg">',
    },
    { pageId: "page-1", locale: "zh", title: "关于", content: "Large body" },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  db.query.page.findMany.mockResolvedValue([row]);
  db.where.mockResolvedValue([{ count: 101 }]);
});
it("reads only list fields and titles, preserves deletion versions, and never loads media", async () => {
  expect(queries).toHaveProperty("listPageSummaries");
  const result = await queries.listPageSummaries(
    asMockDatabase(db),
    { page: 2, limit: 100 },
    "ALL",
  );
  expect(result).toEqual({
    list: [
      {
        id: "page-1",
        version: 7,
        views: 9,
        status: PageStatus.DRAFT,
        template: PageTemplate.DEFAULT,
        createdAt: row.createdAt,
        updatedAt: null,
        title: { en: "About", zh: "关于" },
        author: row.author,
      },
    ],
    total: 101,
  });
  expect(db.query.page.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      columns: {
        id: true,
        version: true,
        views: true,
        status: true,
        template: true,
        createdAt: true,
        updatedAt: true,
      },
      with: {
        author: { columns: { id: true, name: true } },
        translations: { columns: { locale: true, title: true } },
      },
      limit: 100,
      offset: 100,
    }),
  );
  expect(db.select).toHaveBeenCalledTimes(1);
});
it("reads menu options without authors, body, media, versions or private creation fields", async () => {
  expect(queries).toHaveProperty("listPageMenuOptions");
  const result = await queries.listPageMenuOptions(
    asMockDatabase(db),
    { page: 1, limit: 100 },
    "ALL",
  );
  expect(result).toEqual({
    list: [
      {
        id: "page-1",
        title: { en: "About", zh: "关于" },
        createdAt: row.createdAt,
        updatedAt: null,
      },
    ],
    total: 101,
  });
  expect(db.query.page.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      columns: { id: true, createdAt: true, updatedAt: true },
      with: { translations: { columns: { locale: true, title: true } } },
    }),
  );
  expect(db.select).toHaveBeenCalledTimes(1);
});
it("applies publication and bilingual search filters to the same narrow read", async () => {
  expect(queries).toHaveProperty("listPageSummaries");
  await queries.listPageSummaries(
    asMockDatabase(db),
    { title: "About" },
    "PUBLISHED_ONLY",
  );
  const where = db.query.page.findMany.mock.calls[0]?.[0].where;
  const sql = new SQLiteSyncDialect().sqlToQuery(where);
  expect(sql.params).toEqual(
    expect.arrayContaining(["%About%", PageStatus.PUBLISHED]),
  );
  expect(sql.sql).toContain('"page_translation"');
  expect(sql.sql).toContain('"page"."status"');
});
