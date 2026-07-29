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
  const [cache, registry, memory] = await Promise.all([
    import("./upstash-cache"),
    import("@/packages/observability/server/registry"),
    import("@/packages/observability/adapters/memory"),
  ]);
  return { cache, registry, memory };
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

    const { cache, registry, memory } = await loadModule();
    const observed = memory.createMemoryObservability();
    registry.configureObservability(observed);

    await expect(cache.getCacheJSON("post.index", "key")).resolves.toBeNull();
    await expect(cache.getCacheVersion("post.index", "version")).resolves.toBe(
      1,
    );
    await expect(cache.bumpCacheVersion("post.index", "version")).resolves.toBe(
      1,
    );
    await expect(
      cache.setCacheJSON("post.index", "key", { foo: "bar" }, 60),
    ).resolves.toBeUndefined();
    expect(redisCtor).not.toHaveBeenCalled();
    expect(observed.metricEvents).toEqual([]);
  });

  it("reads and writes cache values when redis is configured", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    const { cache } = await loadModule();

    redisInstance.get.mockResolvedValueOnce({ foo: "bar" });
    await expect(
      cache.getCacheJSON("post.index", "cache:key"),
    ).resolves.toEqual({ foo: "bar" });
    expect(redisCtor).toHaveBeenCalledWith({
      url: "https://example.upstash.io",
      token: "token",
    });

    await cache.setCacheJSON("post.index", "cache:key", { foo: "bar" }, 120);
    expect(redisInstance.set).toHaveBeenCalledWith(
      "cache:key",
      { foo: "bar" },
      { ex: 120 },
    );
  });

  it("normalizes cache version values", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";

    const { cache } = await loadModule();

    redisInstance.get.mockResolvedValueOnce("3");
    await expect(
      cache.getCacheVersion("post.index", "version:key"),
    ).resolves.toBe(3);

    redisInstance.get.mockResolvedValueOnce("0");
    await expect(
      cache.getCacheVersion("post.index", "version:key"),
    ).resolves.toBe(1);

    redisInstance.get.mockResolvedValueOnce("not-a-number");
    await expect(
      cache.getCacheVersion("post.index", "version:key"),
    ).resolves.toBe(1);

    redisInstance.incr.mockResolvedValueOnce(8);
    await expect(
      cache.bumpCacheVersion("post.index", "version:key"),
    ).resolves.toBe(8);
  });

  it("records read, hit, miss, write, and error without cache keys", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    const { cache, registry, memory } = await loadModule();
    const observed = memory.createMemoryObservability();
    registry.configureObservability(observed);

    redisInstance.get
      .mockResolvedValueOnce({ foo: "bar" })
      .mockResolvedValueOnce(null);
    await cache.getCacheJSON("post.index", "cache:post:index:user-123");
    await cache.getCacheJSON("post.index", "cache:post:index:user-456");
    await cache.setCacheJSON(
      "post.index",
      "cache:post:index:user-123",
      { foo: "bar" },
      60,
    );
    redisInstance.get.mockRejectedValueOnce(new Error("token=secret user-789"));
    await expect(
      cache.getCacheJSON("post.index", "cache:post:index:user-789"),
    ).rejects.toThrow("token=secret user-789");

    expect(observed.metricEvents.map(({ labels }) => labels)).toEqual([
      { namespace: "post.index", operation: "read", outcome: "success" },
      { namespace: "post.index", operation: "hit", outcome: "success" },
      { namespace: "post.index", operation: "read", outcome: "success" },
      { namespace: "post.index", operation: "miss", outcome: "success" },
      { namespace: "post.index", operation: "write", outcome: "success" },
      { namespace: "post.index", operation: "read", outcome: "error" },
      { namespace: "post.index", operation: "error", outcome: "error" },
    ]);
    const serialized = JSON.stringify(observed.metricEvents);
    expect(serialized).not.toContain("user-123");
    expect(serialized).not.toContain("user-456");
    expect(serialized).not.toContain("user-789");
    expect(serialized).not.toContain("secret");
  });

  it("drops metrics for an unsafe cache namespace", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    const { cache, registry, memory } = await loadModule();
    const observed = memory.createMemoryObservability();
    registry.configureObservability(observed);
    redisInstance.get.mockResolvedValueOnce(null);

    await expect(
      cache.getCacheJSON("user-123" as never, "cache:secret-resource"),
    ).resolves.toBeNull();

    expect(observed.metricEvents).toEqual([]);
  });

  it("records failed writes and version bumps without leaking cache keys", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    const { cache, registry, memory } = await loadModule();
    const observed = memory.createMemoryObservability();
    registry.configureObservability(observed);

    redisInstance.set.mockRejectedValueOnce(new Error("write failed"));
    await expect(
      cache.setCacheJSON("post.index", "cache:private-key", {}, 60),
    ).rejects.toThrow("write failed");

    redisInstance.incr.mockRejectedValueOnce(new Error("increment failed"));
    await expect(
      cache.bumpCacheVersion("post.index", "cache:private-version"),
    ).rejects.toThrow("increment failed");

    expect(observed.metricEvents.map(({ labels }) => labels)).toEqual([
      { namespace: "post.index", operation: "write", outcome: "error" },
      { namespace: "post.index", operation: "error", outcome: "error" },
      { namespace: "post.index", operation: "write", outcome: "error" },
      { namespace: "post.index", operation: "error", outcome: "error" },
    ]);
    expect(JSON.stringify(observed.metricEvents)).not.toContain("private");
  });
});
