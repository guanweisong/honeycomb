import { beforeEach, describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { getCachedPostList } from "@/features/post/server/post-list-cache";
import type { PostWithRelations } from "@/features/post/types/post.read-model";
import { PostType } from "@/features/post/types/post.type";
import { PostStatus } from "@/features/post/types/post.status";
import { EnableStatus } from "@/lib/validation/enable-status";

const cache = vi.hoisted(() => ({
  value: undefined as unknown,
  getVersion: vi.fn(),
  getJSON: vi.fn(),
  setJSON: vi.fn(),
}));
vi.mock("@/lib/cache/upstash-cache", () => ({
  getCacheVersion: cache.getVersion,
  setCacheJSON: cache.setJSON,
  getCacheJSON: cache.getJSON,
}));

const post: PostWithRelations = {
  id: "post",
  version: 0,
  authorId: "author",
  categoryId: "category",
  title: null,
  content: null,
  excerpt: null,
  status: PostStatus.PUBLISHED,
  type: PostType.ARTICLE,
  commentStatus: EnableStatus.ENABLE,
  coverId: null,
  quoteAuthor: null,
  quoteContent: null,
  movieTime: null,
  galleryLocation: null,
  galleryTime: null,
  views: 0,
  createdAt: null,
  updatedAt: null,
  movieActors: [],
  movieDirectors: [],
  movieStyles: [],
  galleryStyles: [],
};
const fresh = {
  list: [
    {
      id: "post",
      type: PostType.ARTICLE,
      title: null,
      excerpt: null,
      movieTime: null,
      quoteAuthor: null,
      quoteContent: null,
      updatedAt: null,
    },
  ],
  total: 1,
};
const listPublicPosts = vi.hoisted(() => vi.fn());
vi.mock("@/features/post/server/post-queries", () => ({ listPublicPosts }));

describe("post list cache validation", () => {
  beforeEach(() => {
    listPublicPosts.mockReset().mockResolvedValue(fresh);
    cache.value = undefined;
    cache.getVersion.mockReset().mockResolvedValue(1);
    cache.setJSON.mockReset().mockResolvedValue(undefined);
    cache.getJSON
      .mockReset()
      .mockImplementation(
        async (
          _namespace: string,
          _key: string,
          decode?: (value: unknown) => unknown,
        ) => {
          try {
            return decode ? decode(cache.value) : cache.value;
          } catch {
            return null;
          }
        },
      );
  });

  it.each(["getVersion", "getJSON", "setJSON"] as const)(
    "returns fresh public data when cache %s fails",
    async (operation) => {
      cache[operation].mockRejectedValue(new Error("Redis unavailable"));
      const list = listPublicPosts.mockResolvedValue(fresh);
      const db = asMockDatabase(createMockDb());

      await expect(getCachedPostList(db, {})).resolves.toEqual(fresh);
      expect(list).toHaveBeenCalledExactlyOnceWith(db, {});
      if (operation === "getVersion") {
        expect(cache.getJSON).not.toHaveBeenCalled();
        expect(cache.setJSON).not.toHaveBeenCalled();
      }
    },
  );

  it.each([false, true])(
    "propagates database failures when cache is unavailable: %s",
    async (cacheFails) => {
      if (cacheFails)
        cache.getVersion.mockRejectedValue(new Error("Redis unavailable"));
      const failure = new Error("database unavailable");
      const list = listPublicPosts.mockRejectedValue(failure);
      const db = asMockDatabase(createMockDb());

      await expect(getCachedPostList(db, {})).rejects.toBe(failure);
      expect(list).toHaveBeenCalledOnce();
      expect(cache.setJSON).not.toHaveBeenCalled();
    },
  );

  it.each([
    { list: [{ ...post, id: undefined }], total: 1 },
    { list: [{ ...post, type: "UNKNOWN" }], total: 1 },
    { list: [{ ...post, title: { en: 123 } }], total: 1 },
    {
      list: [{ ...post, cover: { url: 123, width: 800, height: 600 } }],
      total: 1,
    },
    { list: [{ ...post, updatedAt: 123 }], total: 1 },
    { list: [], total: "1" },
    { total: 1 },
  ])("ignores invalid cached DTO data (%#)", async (value) => {
    cache.value = value;
    await expect(
      getCachedPostList(asMockDatabase(createMockDb()), {}),
    ).resolves.toEqual(fresh);
    expect(listPublicPosts).toHaveBeenCalledOnce();
  });
  it("returns a validated cached list without replacing it with a fresh query", async () => {
    cache.value = { list: [{ ...post, id: "cached" }], total: 1 };
    await expect(
      getCachedPostList(asMockDatabase(createMockDb()), {}),
    ).resolves.toMatchObject({ list: [{ id: "cached" }], total: 1 });
    expect(listPublicPosts).not.toHaveBeenCalled();
  });

  it("strips bodies and unused relations from legacy cached public lists", async () => {
    cache.value = {
      list: [
        {
          ...post,
          author: {
            id: "author",
            name: "Public name",
            email: "private@example.com",
            level: "ADMIN",
            status: "ENABLE",
            createdAt: "2026-09-11T00:00:00.000Z",
            updatedAt: "2026-09-11T00:00:00.000Z",
          },
        },
      ],
      total: 1,
    };

    const result = await getCachedPostList(asMockDatabase(createMockDb()), {});

    expect(result.list[0]).not.toHaveProperty("author");
    expect(result.list[0]).not.toHaveProperty("content");
    expect(result.list[0]).not.toHaveProperty("category");
    expect(result.list[0]).not.toHaveProperty("movieActors");
    expect(result.list[0]).toMatchObject({
      id: "post",
      type: PostType.ARTICLE,
      updatedAt: null,
    });
  });
});
