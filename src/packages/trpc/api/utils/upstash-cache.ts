import "server-only";

import { Redis } from "@upstash/redis";
import { getUpstashEnv } from "@/env/server";
import { MetricName } from "@/packages/observability/core/names";
import { getMetrics } from "@/packages/observability/server/registry";

export type CacheNamespace = "post.index";
const cacheNamespaces = new Set<CacheNamespace>(["post.index"]);

let redisClient: Redis | null = null;
let initialized = false;

function getRedisClient(): Redis | null {
  if (initialized) return redisClient;
  initialized = true;

  const upstash = getUpstashEnv();
  if (!upstash) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis(upstash);
  return redisClient;
}

function recordCacheOperation(
  namespace: CacheNamespace,
  operation: "read" | "hit" | "miss" | "write" | "error",
  outcome: "success" | "error",
): void {
  if (!cacheNamespaces.has(namespace)) return;
  getMetrics().increment(MetricName.cacheOperationsTotal, {
    namespace,
    operation,
    outcome,
  });
}

async function observeCacheRead<T>(
  namespace: CacheNamespace,
  read: () => Promise<T | null>,
): Promise<T | null> {
  try {
    const value = await read();
    recordCacheOperation(namespace, "read", "success");
    recordCacheOperation(namespace, value == null ? "miss" : "hit", "success");
    return value;
  } catch (error) {
    recordCacheOperation(namespace, "read", "error");
    recordCacheOperation(namespace, "error", "error");
    throw error;
  }
}

export async function getCacheJSON<T>(
  namespace: CacheNamespace,
  key: string,
): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  return observeCacheRead(namespace, async () => {
    return await redis.get<T>(key);
  });
}

export async function setCacheJSON<T>(
  namespace: CacheNamespace,
  key: string,
  value: T,
  expireSeconds: number,
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: expireSeconds });
    recordCacheOperation(namespace, "write", "success");
  } catch (error) {
    recordCacheOperation(namespace, "write", "error");
    recordCacheOperation(namespace, "error", "error");
    throw error;
  }
}

export async function getCacheVersion(
  namespace: CacheNamespace,
  key: string,
): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 1;
  const raw = await observeCacheRead<number | string>(namespace, async () => {
    return await redis.get<number | string>(key);
  });
  if (raw == null) return 1;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function bumpCacheVersion(
  namespace: CacheNamespace,
  key: string,
): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 1;
  try {
    const next = await redis.incr(key);
    recordCacheOperation(namespace, "write", "success");
    return Number(next);
  } catch (error) {
    recordCacheOperation(namespace, "write", "error");
    recordCacheOperation(namespace, "error", "error");
    throw error;
  }
}
