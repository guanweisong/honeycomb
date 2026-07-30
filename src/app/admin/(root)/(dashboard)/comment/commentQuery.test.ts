import { describe, expect, it } from "vitest";

import { normalizeCommentQueryParams } from "./commentQuery";

describe("comment query parameters", () => {
  it("preserves the submitted filters and pagination input", () => {
    expect(
      normalizeCommentQueryParams({
        content: "needs review",
        status: ["TO_AUDIT"],
        page: 2,
        limit: 20,
      }),
    ).toEqual({
      content: "needs review",
      status: ["TO_AUDIT"],
      page: 2,
      limit: 20,
    });
  });
});
