import { beforeEach, describe, expect, it } from "vitest";
import { createApiRatelimit, getClientIp } from "./rate-limit";

const originalEnv = {
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
};

describe("getClientIp", () => {
  beforeEach(() => {
    process.env.UPSTASH_REDIS_REST_URL = originalEnv.url;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalEnv.token;
  });

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

  it("allows requests without constructing Redis when Upstash env is missing", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const apiRatelimit = createApiRatelimit();
    const result = await apiRatelimit.limit("127.0.0.1");

    expect(result.success).toBe(true);
    expect(result.limit).toBe(120);
    expect(result.remaining).toBe(120);
    expect(result.reset).toBeGreaterThan(Date.now());
  });

  it("constructs Upstash rate limiter when env is configured", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    const apiRatelimit = createApiRatelimit();

    expect(apiRatelimit.limit).toEqual(expect.any(Function));
  });
});
