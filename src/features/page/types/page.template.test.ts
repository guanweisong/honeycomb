// @vitest-environment node

import { describe, expect, it } from "vitest";
import { PageTemplate } from "@/features/page/types/page.template";

describe("domain contracts", () => {
  it("preserves stable page.template values", () => {
    expect(Object.values(PageTemplate)).toEqual(["default", "friendly-links"]);
  });
});
