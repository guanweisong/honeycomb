import { describe, expect, it } from "vitest";
import { formatAccountSecurityDate } from "./account-security-date";

describe("formatAccountSecurityDate", () => {
  it("formats dates and serialized numeric timestamps", () => {
    expect(formatAccountSecurityDate(new Date("2026-01-01"))).not.toBe(
      "未知时间",
    );
    expect(formatAccountSecurityDate("1786288777627.0")).not.toBe(
      "未知时间",
    );
  });

  it("returns the account-security placeholder for missing or invalid values", () => {
    expect(formatAccountSecurityDate(undefined)).toBe("未知时间");
    expect(formatAccountSecurityDate("invalid")).toBe("未知时间");
  });
});
