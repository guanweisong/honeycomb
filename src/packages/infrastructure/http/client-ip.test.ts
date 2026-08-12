import { describe, expect, it } from "vitest";
import { getClientIp } from "./client-ip";

describe("getClientIp", () => {
  it("uses the first forwarded address", () => {
    const request = new Request("https://example.test", {
      headers: { "x-forwarded-for": "203.0.113.8, 10.0.0.1" },
    });

    expect(getClientIp(request)).toBe("203.0.113.8");
  });

  it("falls back to the real IP and then anonymous", () => {
    expect(
      getClientIp(
        new Request("https://example.test", {
          headers: { "x-real-ip": " 2001:db8::1 " },
        }),
      ),
    ).toBe("2001:db8::1");
    expect(getClientIp(new Request("https://example.test"))).toBe("anonymous");
  });
});
