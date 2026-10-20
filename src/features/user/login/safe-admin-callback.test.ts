import { describe, expect, it } from "vitest";
import { normalizeAdminCallback } from "./safe-admin-callback";

describe("normalizeAdminCallback", () => {
  it("preserves an absolute admin callback with its query string", () => {
    expect(normalizeAdminCallback("/admin/post?x=1")).toBe("/admin/post?x=1");
  });

  it("falls back for non-admin or externally-controlled callbacks", () => {
    for (const value of [
      "javascript:alert(1)",
      "//evil.test",
      "https://evil.test",
      "/blog",
    ]) {
      expect(normalizeAdminCallback(value)).toBe("/admin/dashboard");
    }
  });

  it.each([
    "/administrator",
    "/admin/../blog",
    "/admin//post",
    "/admin%2fpost",
    "/admin\\evil.test",
  ])("rejects encoded or path-confusion callback %s", (value) => {
    expect(normalizeAdminCallback(value)).toBe("/admin/dashboard");
  });
});
