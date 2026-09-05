import { describe, expect, it } from "vitest";
import { requireDefined } from "./require-defined";

describe("requireDefined", () => {
  it("preserves present values, including falsy ones", () => {
    const value = { id: "fixture" };
    expect(requireDefined(value)).toBe(value);
    expect(requireDefined(0)).toBe(0);
    expect(requireDefined(false)).toBe(false);
    expect(requireDefined("")).toBe("");
  });

  it.each([null, undefined])("rejects missing fixtures: %s", (value) => {
    expect(() => requireDefined(value)).toThrow("Expected a defined test value");
  });
});
