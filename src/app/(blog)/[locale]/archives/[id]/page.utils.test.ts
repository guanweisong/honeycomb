import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { PostType } from "@/packages/domain/content/post";

const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

import {
  assertPostDetail,
  createPostJsonLd,
  getPostTitle,
  handlePostDetailError,
} from "./page.utils";

describe("archives page utils", () => {
  beforeEach(() => {
    mockNotFound.mockClear();
  });

  it("throws notFound for missing post detail", () => {
    expect(() => assertPostDetail(null)).toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("returns post detail unchanged", () => {
    const postDetail = { id: "post-id" };

    expect(assertPostDetail(postDetail)).toBe(postDetail);
  });

  it("maps trpc not found errors to notFound", () => {
    expect(() =>
      handlePostDetailError(new TRPCError({ code: "NOT_FOUND" })),
    ).toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("rethrows unexpected errors", () => {
    expect(() => handlePostDetailError(new Error("boom"))).toThrow("boom");
  });

  it("builds localized post titles and JSON-LD data", () => {
    const post = {
      type: PostType.MOVIE,
      title: { zh: "电影" },
      movieTime: "2024-01-01T00:00:00.000Z",
      cover: { url: "https://example.test/cover.webp" },
      excerpt: { zh: "简介" },
    } as const;

    expect(getPostTitle(post, "zh")).toContain("电影");
    expect(createPostJsonLd(post, "zh")).toMatchObject({
      "@type": "Movie",
      image: post.cover.url,
      description: "简介",
    });
  });
});
