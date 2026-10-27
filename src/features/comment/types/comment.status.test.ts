// @vitest-environment node

import { describe, expect, it } from "vitest";
import { CommentStatus } from "@/features/comment/types/comment.status";

describe("domain contracts", () => {
  it("preserves stable comment.status values", () => {
    expect(Object.values(CommentStatus)).toEqual([
      "TO_AUDIT",
      "PUBLISH",
      "RUBBISH",
      "BAN",
    ]);
  });
});
