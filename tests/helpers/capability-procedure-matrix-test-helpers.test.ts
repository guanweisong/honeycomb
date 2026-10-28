import { describe, expect, it } from "vitest";
import { normalizeDeclarationMatrix } from "@tests/helpers/capability-procedure-matrix-test-helpers";

describe("declaration matrix normalization", () => {
  it("sorts a new array without reconstructing typed entries or mutating input", () => {
    const second = Object.assign(["z.read", "read"] as const, { owner: "z" });
    const first = Object.assign(["a.write", "write"] as const, { owner: "a" });
    const input = [second, first];
    const result = normalizeDeclarationMatrix(input);
    expect(result).toEqual([first, second]);
    expect(result[0]).toBe(first);
    expect(result[1]).toBe(second);
    expect(result).not.toBe(input);
    expect(input).toEqual([second, first]);
  });

  it("rejects duplicate paths even when permissions differ", () => {
    expect(() =>
      normalizeDeclarationMatrix([
        ["post.read", "read"],
        ["post.read", "write"],
      ]),
    ).toThrow("Duplicate protected procedure path: post.read");
  });
});
