import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRPCError } from "@trpc/server";

const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
}));

import { assertPostDetail, handlePostDetailError } from "./page.utils";

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
});
