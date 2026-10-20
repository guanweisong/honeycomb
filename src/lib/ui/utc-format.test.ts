// @vitest-environment node

import { describe, expect, it } from "vitest";
import { utcFormat } from "./utc-format";

describe("utcFormat", () => {
  it("formats the UTC day rather than the input timezone's calendar day", () => {
    expect(utcFormat("2026-01-01T01:02:03+08:00")).toBe("2025-12-31");
  });

  it("preserves supported dayjs tokens and time fields", () => {
    expect(utcFormat("2026-02-03T04:05:06Z", "YY/M/D HH:mm:ss")).toBe(
      "26/2/3 04:05:06",
    );
  });

  it("returns an empty string for invalid input", () => {
    expect(utcFormat("not-a-date")).toBe("");
  });
});
