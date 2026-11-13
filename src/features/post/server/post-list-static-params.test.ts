import { describe, expect, it } from "vitest";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { listPublishedPostListFilterIds } from "@/features/post/server/post-queries";
import { PostStatus } from "@/features/post/types/post.status";
import * as schema from "@/lib/db/schema";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";

const dialect = new SQLiteSyncDialect();

describe("published post list static parameter projection", () => {
  it("returns grouped author and tag IDs from published posts only", async () => {
    const db = createMockDb();
    db.groupBy
      .mockResolvedValueOnce([{ id: "published-author" }])
      .mockResolvedValueOnce([{ id: "published-tag" }]);

    await expect(
      listPublishedPostListFilterIds(asMockDatabase(db)),
    ).resolves.toEqual({
      authorIds: ["published-author"],
      tagIds: ["published-tag"],
    });

    expect(db.select).toHaveBeenNthCalledWith(1, {
      id: schema.post.authorId,
    });
    expect(db.select).toHaveBeenNthCalledWith(2, {
      id: schema.postTag.tagId,
    });
    expect(db.from).toHaveBeenNthCalledWith(1, schema.post);
    expect(db.from).toHaveBeenNthCalledWith(2, schema.postTag);
    expect(db.where).toHaveBeenCalledTimes(2);
    expect(dialect.sqlToQuery(db.where.mock.calls[0]?.[0]).params).toEqual([
      PostStatus.PUBLISHED,
    ]);
    expect(dialect.sqlToQuery(db.where.mock.calls[1]?.[0]).params).toEqual([
      PostStatus.PUBLISHED,
    ]);
    expect(db.groupBy).toHaveBeenNthCalledWith(1, schema.post.authorId);
    expect(db.groupBy).toHaveBeenNthCalledWith(2, schema.postTag.tagId);
    expect(db.query.post.findMany).not.toHaveBeenCalled();
  });
});
