import { describe, expect, it } from "vitest";
import { formatAdminDateTime } from "./date-time";

describe("formatAdminDateTime", () => {
  it("formats supported date values for admin tables", () => {
    expect(formatAdminDateTime(new Date(2026, 8, 12, 8, 9, 10))).toBe(
      "2026-09-12 08:09:10",
    );
  });

  it.each([null, undefined, "", "not-a-date"])(
    "returns a placeholder for %s",
    (value) => {
      expect(formatAdminDateTime(value)).toBe("-");
    },
  );
});
