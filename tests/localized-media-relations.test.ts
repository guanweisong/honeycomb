import { describe, expect, it } from "vitest";
import { createPostQueryRepository } from "@/features/post/infrastructure/post-query-repository";
import { createPageQueryRepository } from "@/features/page/infrastructure/page-query-repository";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { createPostFixture } from "@tests/helpers/post-fixtures";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";

const zhUrl = "https://example.test/zh.png";
const enUrl = "https://example.test/en.png";
const content = {
  zh: `<img src="${zhUrl}"><img src="${zhUrl}">`,
  en: `<img src="${enUrl}"><img src="${zhUrl}">`,
};
const images = [zhUrl, enUrl].map((url, index) => ({
  id: `media-${index}`,
  url,
  key: url,
  name: "image.png",
  type: "image/png",
  size: 1,
  width: 1,
  height: 1,
  color: null,
  createdAt: null,
  updatedAt: null,
}));
const page = {
  id: "page-1",
  title: null,
  content,
  status: "PUBLISHED",
  template: "default",
  authorId: "user-1",
  createdAt: null,
  updatedAt: null,
  author: null,
};

describe("localized media relations", () => {
  it("post detail loads unique images from all supported locales", async () => {
    const db = createMockDb();
    const post = createPostFixture({ content });
    db.limit.mockResolvedValue([post]);
    db.query.post.findMany.mockResolvedValue([{ ...post, postTags: [] }]);
    db.where
      .mockReturnValueOnce(db)
      .mockResolvedValueOnce([...images, ...images]);
    const result = await createPostQueryRepository(asMockDatabase(db)).detail(
      "post-1",
      "ALL",
    );
    const query = new SQLiteSyncDialect().sqlToQuery(
      db.where.mock.calls[1]?.[0],
    );
    expect(query.params).toEqual([zhUrl, enUrl]);
    expect(result?.imagesInContent.map(({ url }) => url)).toEqual([
      zhUrl,
      enUrl,
    ]);
  });
  it("page detail loads unique images from all supported locales", async () => {
    const db = createMockDb();
    db.query.page.findFirst.mockResolvedValue(page);
    db.where.mockResolvedValue([...images, ...images]);
    const result = await createPageQueryRepository(asMockDatabase(db)).detail(
      "page-1",
      "ALL",
    );
    expect(
      new SQLiteSyncDialect().sqlToQuery(db.where.mock.calls[0]?.[0]).params,
    ).toEqual([zhUrl, enUrl]);
    expect(result?.imagesInContent.map(({ url }) => url)).toEqual([
      zhUrl,
      enUrl,
    ]);
  });
  it("page lists map deduplicated images from all locales", async () => {
    const db = createMockDb();
    db.offset.mockResolvedValue([page]);
    db.query.page.findMany.mockResolvedValue([page]);
    db.where
      .mockReturnValueOnce(db)
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce(images);
    const result = await createPageQueryRepository(asMockDatabase(db)).list(
      {},
      "ALL",
    );
    expect(result.list[0]?.imagesInContent.map(({ url }) => url)).toEqual([
      zhUrl,
      enUrl,
    ]);
  });
});
