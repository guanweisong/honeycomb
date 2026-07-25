import { describe, expect, it } from "vitest";
import { getAuthErrorCode } from "./adminQueryClient";

describe("getAuthErrorCode", () => {
  it.each(["UNAUTHORIZED", "FORBIDDEN"] as const)(
    "recognizes %s tRPC errors",
    (code) => {
      expect(getAuthErrorCode({ data: { code } })).toBe(code);
    },
  );

  it("ignores non-authentication errors", () => {
    expect(getAuthErrorCode({ data: { code: "INTERNAL_SERVER_ERROR" } })).toBe(
      undefined,
    );
    expect(getAuthErrorCode(new Error("network error"))).toBe(undefined);
  });
});
