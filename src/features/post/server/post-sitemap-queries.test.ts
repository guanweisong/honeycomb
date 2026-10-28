import { describe, expect, it } from "vitest";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import {
  listPublishedPostSitemapEntries,
  countPublishedPosts,
} from "@/features/post/server/post-queries";
import { PostStatus } from "@/features/post/types/post.status";
import * as schema from "@/lib/db/schema";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";

const dialect = new SQLiteSyncDialect();
describe("published post sitemap projection", () => {
  it("reads only stable ordered ID/timestamp rows for the requested batch", async () => {
    const db = createMockDb();
    const rows = [{ id: "post", updatedAt: null }];
    db.offset.mockResolvedValue(rows);
    expect(
      await listPublishedPostSitemapEntries(asMockDatabase(db), 2, 100),
    ).toEqual(rows);
    expect(db.select).toHaveBeenCalledExactlyOnceWith({
      id: schema.post.id,
      updatedAt: schema.post.updatedAt,
    });
    expect(db.limit).toHaveBeenCalledWith(100);
    expect(db.offset).toHaveBeenCalledWith(100);
    expect(dialect.sqlToQuery(db.where.mock.calls[0]?.[0]).params).toEqual([
      PostStatus.PUBLISHED,
    ]);
    expect(db.orderBy.mock.calls[0]).toHaveLength(2);
    expect(db.query.post.findMany).not.toHaveBeenCalled();
  });
  it("counts published rows without loading an item or relations", async () => {
    const db = createMockDb();
    db.where.mockResolvedValue([{ count: "201" }]);
    expect(await countPublishedPosts(asMockDatabase(db))).toBe(201);
    expect(db.select).toHaveBeenCalledOnce();
    expect(Object.keys(db.select.mock.calls[0]?.[0])).toEqual(["count"]);
    expect(dialect.sqlToQuery(db.where.mock.calls[0]?.[0]).params).toEqual([
      PostStatus.PUBLISHED,
    ]);
    expect(db.query.post.findMany).not.toHaveBeenCalled();
    expect(db.limit).not.toHaveBeenCalled();
  });
});
