// @vitest-environment node

import { describe, expect, it } from "vitest";
import { EnableStatus } from "@/lib/validation/enable-status";

describe("domain contracts", () => {
  it("preserves stable enable status values", () => {
    expect(Object.values(EnableStatus)).toEqual(["ENABLE", "DISABLE"]);
  });
});
