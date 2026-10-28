import { describe, expect, it } from "vitest";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import {
  listPublishedPageSitemapEntries,
  countPublishedPages,
} from "@/features/page/server/page-queries";
import { PageStatus } from "@/features/page/types/page.status";
import * as schema from "@/lib/db/schema";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";

const dialect = new SQLiteSyncDialect();
describe("published page sitemap projection", () => {
  it("reads only stable ordered ID/timestamp rows for the requested batch", async () => {
    const db = createMockDb();
    const rows = [{ id: "page", updatedAt: null }];
    db.offset.mockResolvedValue(rows);
    expect(
      await listPublishedPageSitemapEntries(asMockDatabase(db), 2, 100),
    ).toEqual(rows);
    expect(db.select).toHaveBeenCalledExactlyOnceWith({
      id: schema.page.id,
      updatedAt: schema.page.updatedAt,
    });
    expect(db.limit).toHaveBeenCalledWith(100);
    expect(db.offset).toHaveBeenCalledWith(100);
    expect(dialect.sqlToQuery(db.where.mock.calls[0]?.[0]).params).toEqual([
      PageStatus.PUBLISHED,
    ]);
    expect(db.orderBy.mock.calls[0]).toHaveLength(2);
    expect(db.query.page.findMany).not.toHaveBeenCalled();
  });
  it("counts published rows without loading an item or relations", async () => {
    const db = createMockDb();
    db.where.mockResolvedValue([{ count: "201" }]);
    expect(await countPublishedPages(asMockDatabase(db))).toBe(201);
    expect(db.select).toHaveBeenCalledOnce();
    expect(Object.keys(db.select.mock.calls[0]?.[0])).toEqual(["count"]);
    expect(dialect.sqlToQuery(db.where.mock.calls[0]?.[0]).params).toEqual([
      PageStatus.PUBLISHED,
    ]);
    expect(db.query.page.findMany).not.toHaveBeenCalled();
    expect(db.limit).not.toHaveBeenCalled();
  });
});
