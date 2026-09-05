import { describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import { createPostSpecialRepository } from "./post-special-repository";
import type { PostQueryRepository, PostWithRelations } from "../application/repository";
import { PostType } from "@/packages/domain/content/post";
import { PostStatus } from "@/packages/domain/content/post-status";
import { EnableStatus } from "@/packages/domain/shared/enable-status";

const cache = vi.hoisted(() => ({ value: undefined as unknown }));
vi.mock("@/packages/infrastructure/cache/upstash-cache", () => ({
  getCacheVersion: async () => 1,
  setCacheJSON: vi.fn(),
  getCacheJSON: async (_namespace: string, _key: string, decode?: (value: unknown) => unknown) => {
    try { return decode ? decode(cache.value) : cache.value; } catch { return null; }
  },
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
  it.each([
    { list: [{ ...post, status: "UNKNOWN" }], total: 1 },
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
});
