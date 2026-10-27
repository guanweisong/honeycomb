import { describe, expect, it } from "vitest";
import {
  isDeterminateRejectionCode,
  readTrpcErrorCode,
} from "@/lib/trpc/client/mutation-error";

describe("mutation error code", () => {
  it.each(["BAD_REQUEST", "FORBIDDEN", "UNAUTHORIZED", "NOT_FOUND"])(
    "recognizes %s as a determinate rejection",
    (code) => {
      expect(readTrpcErrorCode({ data: { code, extra: true } })).toBe(code);
      expect(isDeterminateRejectionCode(code)).toBe(true);
    },
  );
  it.each(["CONFLICT", "INTERNAL_SERVER_ERROR", "TIMEOUT", "", undefined])(
    "does not interpret %s as a determinate rejection",
    (code) => {
      expect(isDeterminateRejectionCode(code)).toBe(false);
    },
  );
  it.each([
    null,
    undefined,
    "FORBIDDEN",
    new Error("offline"),
    {},
    { code: "FORBIDDEN" },
    { data: null },
    { data: { code: 403 } },
    { data: { code: { toString: () => "FORBIDDEN" } } },
  ])("does not coerce malformed transport data %#", (error) => {
    expect(readTrpcErrorCode(error)).toBeUndefined();
  });
  it("preserves unrecognized string codes for consumer-specific handling", () => {
    expect(readTrpcErrorCode({ data: { code: "CONFLICT" } })).toBe("CONFLICT");
    expect(readTrpcErrorCode({ data: { code: "FUTURE_CODE" } })).toBe(
      "FUTURE_CODE",
    );
  });
});
