import { beforeEach, describe, expect, it, vi } from "vitest";
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core";
import { PostType } from "@/features/post/post-type";
import { PostStatus } from "@/features/post/post-status";
import { postRouter } from "../router";
import { createPostFixture } from "@tests/helpers/post-fixtures";
import {
  createAdminUser,
  createMockContext,
  createMockDb,
} from "@tests/helpers/test-utils";
import { TEST_IDS } from "@tests/helpers/test-constants";

const cache = vi.hoisted(() => ({ setJSON: vi.fn() }));
vi.mock("@/lib/cache/upstash-cache", () => ({
  getCacheVersion: vi.fn().mockResolvedValue(1),
  getCacheJSON: vi.fn().mockResolvedValue(null),
  setCacheJSON: cache.setJSON,
}));

const title = { en: "Card title", zh: "卡片标题" };
const excerpt = { en: "Card excerpt", zh: "卡片摘要" };
const content = { en: "Full article body", zh: "完整文章正文" };
const quoteContent = { en: "A memorable quote", zh: "值得记住的引用" };
const quoteAuthor = { en: "Quote author", zh: "引用作者" };
const cover = {
  id: "cover-1",
  key: "cover.jpg",
  name: "Cover",
  size: 100,
  type: "image/jpeg",
  url: "https://assets.test/cover.jpg",
  color: null,
  width: 800,
  height: 600,
  createdAt: null,
  updatedAt: null,
};

function fixture(type: PostType) {
  return createPostFixture({
    id: TEST_IDS.ID_1,
    type,
    title,
    excerpt,
    content,
    quoteContent,
    quoteAuthor,
    movieTime: "2026-01-01",
    cover,
  });
}

function card(type: PostType) {
  return {
    id: TEST_IDS.ID_1,
    type,
    title,
    excerpt,
    quoteContent,
    quoteAuthor,
    movieTime: "2026-01-01",
    updatedAt: null,
    cover: { url: "https://assets.test/cover.jpg", width: 800, height: 600 },
  };
}

function setupDb(type: PostType, updatedAt: string | null = null) {
  const db = createMockDb();
  const post = fixture(type);
  db.where.mockReturnValueOnce(db).mockResolvedValueOnce([{ count: 11 }]);
  db.offset.mockResolvedValue([{ id: post.id }]);
  db.query.post.findMany.mockResolvedValue([
    {
      ...post,
      updatedAt,
      translations: (["en", "zh"] as const).map((locale) => ({
        postId: post.id,
        locale,
        title: title[locale],
        excerpt: excerpt[locale],
        content: content[locale],
        quoteContent: quoteContent[locale],
        quoteAuthor: quoteAuthor[locale],
        galleryLocation: null,
      })),
      author: { id: "author-1", name: "Author" },
      category: null,
      postTags: [],
    },
  ]);
  return db;
}

describe("public post list payload", () => {
  it("drops withdrawn IDs without inventing empty cards or changing the count", async () => {
    const db = setupDb(PostType.ARTICLE);
    db.query.post.findMany.mockResolvedValue([]);
    const caller = postRouter.createCaller(createMockContext(null, db));
    expect(await caller.index({})).toEqual({ list: [], total: 11 });
  });

  it("keeps partial locales and QUOTE fields without manufacturing translations", async () => {
    const db = setupDb(PostType.QUOTE);
    const post = fixture(PostType.QUOTE);
    db.query.post.findMany.mockResolvedValue([
      {
        ...post,
        translations: [
          {
            postId: post.id,
            locale: "zh",
            title: null,
            excerpt: null,
            quoteContent: "引用",
            quoteAuthor: "作者",
          },
        ],
        author: null,
        category: null,
        postTags: [],
        cover: null,
      },
    ]);
    const caller = postRouter.createCaller(createMockContext(null, db));
    expect((await caller.index({})).list[0]).toMatchObject({
      title: null,
      excerpt: null,
      quoteContent: { zh: "引用" },
      quoteAuthor: { zh: "作者" },
    });
  });
  beforeEach(() => vi.clearAllMocks());

  it("preserves the publication update timestamp required by sitemap consumers", async () => {
    const db = setupDb(PostType.ARTICLE, "2026-10-01T12:00:00.000Z");
    const caller = postRouter.createCaller(createMockContext(null, db));
    expect((await caller.index({ page: 1, limit: 5 })).list[0]).toHaveProperty(
      "updatedAt",
      "2026-10-01T12:00:00.000Z",
    );
  });

  it.each(Object.values(PostType))(
    "returns only card fields for %s through the initial RSC and paginated request paths",
    async (type) => {
      for (const hasRequest of [false, true]) {
        const db = setupDb(type);
        const caller = postRouter.createCaller({
          ...createMockContext(null, db),
          hasRequest,
        });
        const result = await caller.index({
          page: 2,
          limit: 5,
          title: "Card",
          content: "body",
        });

        expect(result).toEqual({ list: [card(type)], total: 11 });
        expect(db.limit).toHaveBeenCalledWith(5);
        expect(db.offset).toHaveBeenCalledWith(5);
        const where = new SQLiteSyncDialect().sqlToQuery(
          db.where.mock.calls[0]?.[0],
        );
        expect(where.sql).toContain('"post_translation"."content" like ?');
        expect(where.params).toEqual(
          expect.arrayContaining(["%Card%", "%body%", PostStatus.PUBLISHED]),
        );
        expect(db.query.post.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            columns: { id: true, type: true, movieTime: true, updatedAt: true },
            with: {
              translations: {
                columns: {
                  locale: true,
                  title: true,
                  excerpt: true,
                  quoteContent: true,
                  quoteAuthor: true,
                },
              },
              cover: { columns: { url: true, width: true, height: true } },
            },
          }),
        );
        const hydratedWhere = new SQLiteSyncDialect().sqlToQuery(
          db.query.post.findMany.mock.calls.at(-1)?.[0].where,
        );
        expect(hydratedWhere.params).toContain(PostStatus.PUBLISHED);
        if (hasRequest) {
          expect(cache.setJSON).toHaveBeenLastCalledWith(
            "post.index",
            expect.any(String),
            { list: [card(type)], total: 11 },
            3600,
          );
        }
      }
    },
  );

  it("returns only admin table fields while keeping detail records complete", async () => {
    const db = setupDb(PostType.QUOTE);
    const caller = postRouter.createCaller(
      createMockContext(createAdminUser(TEST_IDS.ID_2), db),
    );
    const result = await caller.adminIndex({ page: 1, limit: 5 });
    expect(result.list[0]).toEqual({
      id: TEST_IDS.ID_1,
      version: 0,
      title,
      quoteContent,
      category: undefined,
      author: { name: "Author" },
      type: PostType.QUOTE,
      status: PostStatus.PUBLISHED,
      createdAt: null,
      updatedAt: null,
      views: 0,
    });
    expect(db.query.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: {
          id: true,
          version: true,
          type: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          views: true,
        },
        with: {
          translations: {
            columns: { locale: true, title: true, quoteContent: true },
          },
          category: {
            columns: { id: true },
            with: { translations: { columns: { locale: true, title: true } } },
          },
          author: { columns: { name: true } },
        },
      }),
    );

    for (const detail of [caller.detail, caller.adminDetail]) {
      db.where.mockReturnValue(db);
      db.limit.mockResolvedValueOnce([fixture(PostType.QUOTE)]);
      expect(await detail({ id: TEST_IDS.ID_1 })).toMatchObject({
        content,
        quoteContent,
        quoteAuthor,
        authorId: "author-1",
        imagesInContent: [],
      });
    }
  });
});
