import { describe, expect, it } from "vitest";
import { getClientIp } from "./rate-limit";

describe("getClientIp", () => {
  it("uses the first x-forwarded-for entry when available", () => {
    const request = new Request("https://example.com", {
      headers: {
        "x-forwarded-for": " 1.2.3.4, 5.6.7.8 ",
        "x-real-ip": "9.9.9.9",
      },
    });

    expect(getClientIp(request)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", () => {
    const request = new Request("https://example.com", {
      headers: {
        "x-real-ip": " 9.9.9.9 ",
      },
    });

    expect(getClientIp(request)).toBe("9.9.9.9");
  });

  it("returns anonymous when no ip header exists", () => {
    const request = new Request("https://example.com");

    expect(getClientIp(request)).toBe("anonymous");
  });
});
