// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PageStatus } from "@/features/page/types/page.status";

describe("domain contracts", () => {
  it("preserves stable page.status values", () => {
    expect(Object.values(PageStatus)).toEqual([
      "PUBLISHED",
      "DRAFT",
      "TO_AUDIT",
    ]);
  });
});
