// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
const { listPosts } = vi.hoisted(() => ({ listPosts: vi.fn() }));
vi.mock("@/features/post/server/post-queries", () => ({ listPosts }));

const { revalidatePath, revalidateTag } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath, revalidateTag }));

const fetchMock = vi.fn<typeof fetch>();

function pendingUntilAborted(
  _input: Parameters<typeof fetch>[0],
  init?: RequestInit,
): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const signal = init?.signal;
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    signal?.addEventListener("abort", () => reject(signal.reason), {
      once: true,
    });
  });
}

function redisResponse(result: number | null): Response {
  // The real SDK uses auto-pipelining, so the HTTP result is an array.
  return Response.json([{ result }]);
}

function track<T>(promise: Promise<T>) {
  const state: {
    status: "pending" | "fulfilled" | "rejected";
    value?: unknown;
  } = {
    status: "pending",
  };
  void promise.then(
    (value) => Object.assign(state, { status: "fulfilled", value }),
    (value: unknown) => Object.assign(state, { status: "rejected", value }),
  );
  return state;
}

async function loadCache() {
  const [cache, registry, memory] = await Promise.all([
    import("./upstash-cache"),
    import("@/lib/observability/server/registry"),
    import("@tests/helpers/memory-observability"),
  ]);
  const observed = memory.createMemoryObservability();
  registry.configureObservability(observed);
  return { cache, observed };
}

describe("Upstash cache request deadlines", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
    fetchMock.mockReset().mockImplementation(pendingUntilAborted);
    vi.stubGlobal("fetch", fetchMock);
    revalidatePath.mockReset();
    revalidateTag.mockReset();
    // Node's native timeout uses internal timers. Preserve its abort behavior
    // while letting the test clock advance the real SDK's transport deadline.
    vi.spyOn(AbortSignal, "timeout").mockImplementation((delay) => {
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort(new DOMException("Request timed out", "TimeoutError"));
      }, delay);
      return controller.signal;
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each([
    "getCacheJSON",
    "getCacheVersion",
    "setCacheJSON",
    "bumpCacheVersion",
  ] as const)(
    "aborts a never-returning %s request after one second and records an error",
    async (operation) => {
      const { cache, observed } = await loadCache();
      const state = track(
        operation === "setCacheJSON"
          ? cache.setCacheJSON("post.index", "private-key", {}, 60)
          : cache[operation]("post.index", "private-key"),
      );

      await vi.advanceTimersByTimeAsync(999);
      expect(state.status).toBe("pending");
      await vi.advanceTimersByTimeAsync(1);

      expect(state).toEqual({
        status: "rejected",
        value: expect.objectContaining({ name: "TimeoutError" }),
      });
      expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(vi.getTimerCount()).toBe(0);
      const metricOperation = operation.startsWith("get") ? "read" : "write";
      expect(observed.metricEvents.map(({ labels }) => labels)).toEqual([
        {
          namespace: "post.index",
          operation: metricOperation,
          outcome: "error",
        },
        { namespace: "post.index", operation: "error", outcome: "error" },
      ]);
      expect(JSON.stringify(observed.metricEvents)).not.toContain(
        "private-key",
      );
    },
  );

  it("also bounds the second increment needed to leave the implicit version", async () => {
    const { cache } = await loadCache();
    fetchMock.mockResolvedValueOnce(redisResponse(1));
    const state = track(cache.bumpCacheVersion("post.index", "version"));

    await vi.advanceTimersByTimeAsync(1000);

    expect(state).toEqual({
      status: "rejected",
      value: expect.objectContaining({ name: "TimeoutError" }),
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[1]?.signal?.aborted).toBe(true);
  });

  it("uses a fresh timeout signal after a previous request times out", async () => {
    const { cache } = await loadCache();
    const first = track(cache.getCacheVersion("post.index", "version"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(first.status).toBe("rejected");

    fetchMock.mockResolvedValueOnce(redisResponse(3));
    await expect(cache.getCacheVersion("post.index", "version")).resolves.toBe(
      3,
    );

    const firstSignal = fetchMock.mock.calls[0]?.[1]?.signal;
    const secondSignal = fetchMock.mock.calls[1]?.[1]?.signal;
    expect(secondSignal).not.toBe(firstSignal);
    expect(secondSignal?.aborted).toBe(false);
  });

  it("does not add SDK retries or backoff before an existing caller can fall back", async () => {
    const { cache } = await loadCache();
    fetchMock.mockRejectedValue(new Error("Redis unavailable"));
    const state = track(cache.getCacheVersion("post.index", "version"));

    await vi.advanceTimersByTimeAsync(0);

    expect(state).toEqual({ status: "rejected", value: expect.any(Error) });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each(["version", "payload", "fill"] as const)(
    "retains the public database result when the cache %s request never returns",
    async (stage) => {
      await loadCache();
      const { getCachedPostList } =
        await import("@/features/post/server/post-special");
      const fresh = { list: [], total: 0 };
      listPosts.mockReset().mockResolvedValue(fresh);
      if (stage !== "version")
        fetchMock.mockResolvedValueOnce(redisResponse(2));
      if (stage === "fill")
        fetchMock.mockResolvedValueOnce(redisResponse(null));
      const database = asMockDatabase(createMockDb());
      const state = track(getCachedPostList(database, {}));

      await vi.advanceTimersByTimeAsync(1000);

      expect(state.status).toBe("fulfilled");
      expect(state.value).toBe(fresh);
      expect(listPosts).toHaveBeenCalledExactlyOnceWith(
        database,
        {},
        "PUBLISHED_ONLY",
      );
      expect(fetchMock).toHaveBeenCalledTimes(
        stage === "version" ? 1 : stage === "payload" ? 2 : 3,
      );
    },
  );

  it("continues every invalidation target and reports degraded after bounded retries", async () => {
    const { observed } = await loadCache();
    const { publicContentInvalidator } = await import("./refresh-path");
    const state = track(
      publicContentInvalidator.invalidate({
        refreshPostIndex: true,
        refreshSitemap: true,
        contents: [{ id: "507f1f77bcf86cd799439011", type: "post" }],
        refreshLayout: true,
      }),
    );

    await vi.advanceTimersByTimeAsync(1000);
    expect(revalidateTag).toHaveBeenCalledTimes(4);
    expect(revalidatePath).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1000);

    expect(state).toEqual({
      status: "fulfilled",
      value: { state: "degraded" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(revalidateTag.mock.calls).toEqual(
      Array(2)
        .fill([
          ["public.post-index", { expire: 0 }],
          ["public.sitemap", { expire: 0 }],
          ["public.post.507f1f77bcf86cd799439011", { expire: 0 }],
          ["public.layout", { expire: 0 }],
        ])
        .flat(),
    );
    expect(revalidatePath.mock.calls).toEqual(
      Array(2)
        .fill([
          ["/zh/archives/507f1f77bcf86cd799439011"],
          ["/en/archives/507f1f77bcf86cd799439011"],
          ["/[locale]", "layout"],
        ])
        .flat(),
    );
    expect(observed.metricEvents).toContainEqual(
      expect.objectContaining({
        labels: { operation: "invalidate", outcome: "degraded" },
      }),
    );
  });
});
