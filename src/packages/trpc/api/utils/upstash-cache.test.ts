import { beforeEach, describe, expect, it, vi } from "vitest";

const { redisCtor, redisInstance } = vi.hoisted(() => {
  const instance = {
    get: vi.fn(),
    set: vi.fn(),
    incr: vi.fn(),
  };

  return {
    redisCtor: vi.fn(function Redis() {
      return instance;
    }),
    redisInstance: instance,
  };
});

vi.mock("@upstash/redis", () => ({
  Redis: redisCtor,
}));

const originalEnv = {
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
};

async function loadModule() {
  vi.resetModules();
  return await import("./upstash-cache");
}

describe("upstash cache", () => {
  beforeEach(() => {
    redisCtor.mockClear();
    redisInstance.get.mockReset();
    redisInstance.set.mockReset();
    redisInstance.incr.mockReset();
    process.env.UPSTASH_REDIS_REST_URL = originalEnv.url;
    process.env.UPSTASH_REDIS_REST_TOKEN = originalEnv.token;
  });

  it("returns nullish defaults when env is missing", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const cache = await loadModule();

    await expect(cache.getCacheJSON("key")).resolves.toBeNull();
    await expect(cache.getCacheVersion("version")).resolves.toBe(1);
    await expect(cache.bumpCacheVersion("version")).resolves.toBe(1);
    await expect(cache.setCacheJSON("key", { foo: "bar" }, 60)).resolves.toBeUndefined();
    expect(redisCtor).not.toHaveBeenCalled();
  });

  it("reads and writes cache values when redis is configured", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    const cache = await loadModule();

    redisInstance.get.mockResolvedValueOnce({ foo: "bar" });
    await expect(cache.getCacheJSON("cache:key")).resolves.toEqual({ foo: "bar" });
    expect(redisCtor).toHaveBeenCalledWith({
      url: "https://example.upstash.io",
      token: "token",
    });

    await cache.setCacheJSON("cache:key", { foo: "bar" }, 120);
    expect(redisInstance.set).toHaveBeenCalledWith("cache:key", { foo: "bar" }, { ex: 120 });
  });

  it("normalizes cache version values", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    const cache = await loadModule();

    redisInstance.get.mockResolvedValueOnce("3");
    await expect(cache.getCacheVersion("version:key")).resolves.toBe(3);

    redisInstance.get.mockResolvedValueOnce("0");
    await expect(cache.getCacheVersion("version:key")).resolves.toBe(1);

    redisInstance.get.mockResolvedValueOnce("not-a-number");
    await expect(cache.getCacheVersion("version:key")).resolves.toBe(1);

    redisInstance.incr.mockResolvedValueOnce(8);
    await expect(cache.bumpCacheVersion("version:key")).resolves.toBe(8);
  });
});
