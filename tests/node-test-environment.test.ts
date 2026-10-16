// @vitest-environment node

import { describe, expect, it } from "vitest";

describe("opt-in Node test environment", () => {
  it("runs backend tests without browser globals while retaining server Web APIs", () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");

    const request = new Request("https://example.test", {
      headers: { "x-request-id": "node-environment" },
    });
    expect(request.headers.get("x-request-id")).toBe("node-environment");
    expect(typeof crypto.randomUUID()).toBe("string");
  });
});
