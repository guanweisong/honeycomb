import { sql } from "drizzle-orm";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import * as tools from "@/lib/db/query/query-builders";
import { getPost, listPosts } from "../server/post-queries";
import { PostStatus } from "../post-status";
import { createPostFixture } from "@tests/helpers/post-fixtures";
import {
  asMockDatabase,
  createMockDb,
  resetMockDb,
} from "@tests/helpers/test-utils";

const mockDb = createMockDb();
const dialect = new SQLiteSyncDialect();
const first = "507f1f77bcf86cd799439011";
const second = "507f1f77bcf86cd799439012";
function relation(id: string) {
  return {
    ...createPostFixture({ id, version: 3 }),
    creationToken: "private",
    creationInputHash: "private",
    translations: [
      { postId: id, locale: "en", title: "current", content: "current body" },
      { postId: id, locale: "zh", title: "当前", content: "当前正文" },
    ],
    author: null,
    category: null,
    cover: null,
    postTags: [],
  };
}
function prepareList() {
  mockDb.offset.mockResolvedValue([{ id: second }, { id: first }]);
  mockDb.where
    .mockReturnValueOnce(mockDb)
    .mockResolvedValueOnce([{ count: "2" }]);
  mockDb.query.post.findMany.mockResolvedValue([
    relation(first),
    relation(second),
  ]);
}

describe("post ID selection and hydration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetMockDb(mockDb);
    vi.spyOn(tools, "buildDrizzleWhere").mockReturnValue(undefined);
    vi.spyOn(tools, "buildDrizzleOrderBy").mockReturnValue(
      sql`created_at desc`,
    );
  });

  it("selects only ordered paginated IDs and returns the current public projection", async () => {
    prepareList();
    const result = await listPosts(
      asMockDatabase(mockDb),
      {
        page: 2,
        limit: 5,
        sortField: "createdAt",
        sortOrder: "desc",
      },
      "PUBLISHED_ONLY",
    );
    expect(mockDb.select).toHaveBeenNthCalledWith(1, { id: schema.post.id });
    expect(mockDb.limit).toHaveBeenCalledWith(5);
    expect(mockDb.offset).toHaveBeenCalledWith(5);
    expect(tools.buildDrizzleOrderBy).toHaveBeenCalledWith(
      schema.post,
      "createdAt",
      "desc",
      "createdAt",
    );
    expect(result.total).toBe(2);
    expect(result.list.map((post) => post.id)).toEqual([second, first]);
    expect(result.list[0]).toMatchObject({
      version: 3,
      title: { en: "current", zh: "当前" },
    });
    expect(result.list[0]).not.toHaveProperty("creationToken");
    expect(result.list[0]).not.toHaveProperty("creationInputHash");
    expect(
      dialect.sqlToQuery(mockDb.where.mock.calls[0]?.[0]).params,
    ).toContain(PostStatus.PUBLISHED);
    expect(
      dialect.sqlToQuery(mockDb.query.post.findMany.mock.calls[0]?.[0].where)
        .params,
    ).toContain(PostStatus.PUBLISHED);
  });

  it("selects only the detail ID before reading the current snapshot", async () => {
    mockDb.limit.mockResolvedValue([{ id: first }]);
    mockDb.query.post.findMany.mockResolvedValue([relation(first)]);
    const result = await getPost(
      asMockDatabase(mockDb),
      first,
      "PUBLISHED_ONLY",
    );
    expect(mockDb.select).toHaveBeenCalledWith({ id: schema.post.id });
    expect(result).toMatchObject({
      id: first,
      version: 3,
      content: { en: "current body", zh: "当前正文" },
      imagesInContent: [],
    });
    expect(result).not.toHaveProperty("creationToken");
    expect(
      dialect.sqlToQuery(mockDb.query.post.findMany.mock.calls[0]?.[0].where)
        .params,
    ).toContain(PostStatus.PUBLISHED);
  });

  it("drops IDs withdrawn or deleted before hydration without changing the count", async () => {
    prepareList();
    mockDb.query.post.findMany.mockResolvedValue([relation(first)]);
    const result = await listPosts(
      asMockDatabase(mockDb),
      {},
      "PUBLISHED_ONLY",
    );
    expect(result.list.map((post) => post.id)).toEqual([first]);
    expect(result.total).toBe(2);
    mockDb.limit.mockResolvedValue([{ id: second }]);
    mockDb.query.post.findMany.mockResolvedValue([]);
    expect(
      await getPost(asMockDatabase(mockDb), second, "PUBLISHED_ONLY"),
    ).toBeNull();
  });

  it("applies category descendants and author filters", async () => {
    prepareList();
    mockDb.all.mockResolvedValue([{ id: first }, { id: second }]);
    await listPosts(
      asMockDatabase(mockDb),
      { categoryId: first, authorId: "author" },
      "ALL",
    );
    const params = dialect.sqlToQuery(mockDb.where.mock.calls[0]?.[0]).params;
    expect(params).toEqual([first, second, "author"]);
    expect(mockDb.all).toHaveBeenCalledOnce();
  });

  it("returns empty when a tag has no matching IDs", async () => {
    mockDb.offset.mockResolvedValue([]);
    mockDb.where
      .mockReturnValueOnce(mockDb)
      .mockResolvedValueOnce([{ count: 0 }]);
    expect(
      await listPosts(
        asMockDatabase(mockDb),
        { tagId: first },
        "PUBLISHED_ONLY",
      ),
    ).toEqual({ list: [], total: 0 });
    expect(mockDb.orderBy).toHaveBeenCalled();
    const filter = dialect.sqlToQuery(mockDb.where.mock.calls[0]?.[0]);
    expect(filter.sql).toContain("exists");
    expect(filter.params).toEqual([PostStatus.PUBLISHED, first]);
    expect(mockDb.query.post.findMany).not.toHaveBeenCalled();
  });
  it.each(["status", "type"] as const)(
    "still validates the hydrated %s enum",
    async (field) => {
      prepareList();
      mockDb.query.post.findMany.mockResolvedValue([
        { ...relation(first), [field]: "INVALID" },
      ]);
      await expect(
        listPosts(asMockDatabase(mockDb), {}, "ALL"),
      ).rejects.toThrow();
    },
  );
});
