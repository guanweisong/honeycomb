// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PostType } from "@/features/post/types/post.type";

describe("domain contracts", () => {
  it("preserves stable post.type values", () => {
    expect(Object.values(PostType)).toEqual([
      "ARTICLE",
      "MOVIE",
      "PHOTOGRAPH",
      "QUOTE",
    ]);
  });
});
