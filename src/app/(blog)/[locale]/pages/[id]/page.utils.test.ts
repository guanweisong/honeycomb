import { describe, expect, it, vi, beforeEach } from "vitest";
import { PostStatus } from "@/packages/trpc/api/modules/post/types/post.status";

const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

import { assertPublishedPost } from "./page.utils";

describe("assertPublishedPost", () => {
  beforeEach(() => {
    mockNotFound.mockClear();
  });

  it("throws notFound for missing page detail", () => {
    expect(() => assertPublishedPost(null)).toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("throws notFound for draft page detail", () => {
    expect(() =>
      assertPublishedPost({ status: PostStatus.DRAFT }),
    ).toThrow("NEXT_NOT_FOUND");
    expect(mockNotFound).toHaveBeenCalledTimes(1);
  });

  it("returns published page detail unchanged", () => {
    const pageDetail = { status: PostStatus.PUBLISHED, id: "page-id" };

    expect(assertPublishedPost(pageDetail)).toBe(pageDetail);
  });
});
