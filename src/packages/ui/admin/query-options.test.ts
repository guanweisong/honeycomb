import { keepPreviousData } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { adminListQueryOptions } from "./query-options";

describe("adminListQueryOptions", () => {
  it("keeps the previous list for the shared one-minute stale window", () => {
    expect(adminListQueryOptions).toEqual({
      placeholderData: keepPreviousData,
      staleTime: 60_000,
    });
  });
});
