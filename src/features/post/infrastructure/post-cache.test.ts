import { beforeEach, describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { createPostSpecialRepository } from "./post-special-repository";
import type { PostQueryRepository, PostWithRelations } from "../application/repository";
import { PostType } from "@/packages/domain/content/post";
import { PostStatus } from "@/packages/domain/content/post-status";
import { EnableStatus } from "@/packages/domain/shared/enable-status";

const cache = vi.hoisted(() => ({
  value: undefined as unknown,
  getVersion: vi.fn(),
  getJSON: vi.fn(),
  setJSON: vi.fn(),
}));
vi.mock("@/packages/infrastructure/cache/upstash-cache", () => ({
  getCacheVersion: cache.getVersion,
  setCacheJSON: cache.setJSON,
  getCacheJSON: cache.getJSON,
}));

const post: PostWithRelations = {
  id: "post", authorId: "author", categoryId: "category", title: null, content: null,
  excerpt: null, status: PostStatus.PUBLISHED, type: PostType.ARTICLE,
  commentStatus: EnableStatus.ENABLE, coverId: null, quoteAuthor: null,
  quoteContent: null, movieTime: null, galleryLocation: null, galleryTime: null,
  views: 0, createdAt: null, updatedAt: null, movieActors: [], movieDirectors: [],
  movieStyles: [], galleryStyles: [],
};
const fresh = { list: [post], total: 1 };
const query: PostQueryRepository = {
  list: async () => fresh,
  detail: async () => null,
  categoryFilter: async (id) => [id],
};

describe("post list cache validation", () => {
  beforeEach(() => {
    cache.value = undefined;
    cache.getVersion.mockReset().mockResolvedValue(1);
    cache.setJSON.mockReset().mockResolvedValue(undefined);
    cache.getJSON.mockReset().mockImplementation(async (
      _namespace: string,
      _key: string,
      decode?: (value: unknown) => unknown,
    ) => {
      try { return decode ? decode(cache.value) : cache.value; } catch { return null; }
    });
  });

  it.each(["getVersion", "getJSON", "setJSON"] as const)(
    "returns fresh public data when cache %s fails",
    async (operation) => {
      cache[operation].mockRejectedValue(new Error("Redis unavailable"));
      const list = vi.fn().mockResolvedValue(fresh);
      const repository = createPostSpecialRepository(
        asMockDatabase(createMockDb()),
        { ...query, list },
      );

      await expect(repository.cachedList({})).resolves.toEqual(fresh);
      expect(list).toHaveBeenCalledExactlyOnceWith({}, "PUBLISHED_ONLY");
      if (operation === "getVersion") {
        expect(cache.getJSON).not.toHaveBeenCalled();
        expect(cache.setJSON).not.toHaveBeenCalled();
      }
    },
  );

  it.each([false, true])("propagates database failures when cache is unavailable: %s", async (cacheFails) => {
    if (cacheFails) cache.getVersion.mockRejectedValue(new Error("Redis unavailable"));
    const failure = new Error("database unavailable");
    const list = vi.fn().mockRejectedValue(failure);
    const repository = createPostSpecialRepository(
      asMockDatabase(createMockDb()),
      { ...query, list },
    );

    await expect(repository.cachedList({})).rejects.toBe(failure);
    expect(list).toHaveBeenCalledOnce();
    expect(cache.setJSON).not.toHaveBeenCalled();
  });

  it.each([
    { list: [{ ...post, status: "UNKNOWN" }], total: 1 },
    {
      list: [
        {
          ...post,
          category: {
            id: "category",
            title: null,
            description: null,
            parent: null,
            status: "UNKNOWN",
            path: "category",
            createdAt: null,
            updatedAt: null,
          },
        },
      ],
      total: 1,
    },
    { list: [{ ...post, movieActors: [{}] }], total: 1 },
    { list: [{ ...post, views: "many" }], total: 1 },
    { list: [], total: "1" },
    { total: 1 },
  ])("ignores invalid cached DTO data (%#)", async (value) => {
    cache.value = value;
    await expect(createPostSpecialRepository(asMockDatabase(createMockDb()), query).cachedList({})).resolves.toEqual(fresh);
  });
  it("returns a validated cached list without replacing it with a fresh query", async () => {
    cache.value = { list: [{ ...post, id: "cached" }], total: 1 };
    await expect(createPostSpecialRepository(asMockDatabase(createMockDb()), query).cachedList({})).resolves.toMatchObject({ list: [{ id: "cached" }], total: 1 });
  });

  it("strips private account fields from cached public post authors", async () => {
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

    const result = await createPostSpecialRepository(
      asMockDatabase(createMockDb()),
      query,
    ).cachedList({});

    expect(result.list[0]?.author).toEqual({
      id: "author",
      name: "Public name",
    });
  });
});
