// @vitest-environment node

import { describe, expect, it } from "vitest";
import { enableStatusOptions } from "./enable-status-options";
import { EnableStatusName } from "../types/enable-status-name";

describe("enable display options", () => {
  it("preserves enabled status labels and option order", () => {
    expect(EnableStatusName).toEqual({ ENABLE: "启用", DISABLE: "禁用" });
    expect(enableStatusOptions).toEqual([
      { label: "启用", value: "ENABLE" },
      { label: "禁用", value: "DISABLE" },
    ]);
  });
});
