// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PostStatus } from "@/features/post/types/post.status";

describe("domain contracts", () => {
  it("preserves stable post.status values", () => {
    expect(Object.values(PostStatus)).toEqual([
      "PUBLISHED",
      "DRAFT",
      "TO_AUDIT",
    ]);
  });
});
