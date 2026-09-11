import "server-only";

import { Redis } from "@upstash/redis";
import { getUpstashEnv } from "@/env/server";
import { MetricName } from "@/packages/infrastructure/observability/core/names";
import { getMetrics } from "@/packages/infrastructure/observability/server/registry";

import { cacheNamespaceValues, type CacheNamespace } from "./cache-namespaces";
export type { CacheNamespace } from "./cache-namespaces";
const cacheNamespaces = new Set<CacheNamespace>(cacheNamespaceValues);
const implicitCacheVersion = 1;

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

/** 读取并解析指定命名空间下的 JSON 缓存。 */
export function getCacheJSON(
  namespace: CacheNamespace,
  key: string,
): Promise<unknown>;
export function getCacheJSON<T>(
  namespace: CacheNamespace,
  key: string,
  decode: (value: unknown) => T,
): Promise<T | null>;
export async function getCacheJSON(
  namespace: CacheNamespace,
  key: string,
  decode: (value: unknown) => unknown = (value) => value,
): Promise<unknown> {
  const redis = getRedisClient();
  if (!redis) return null;
  return observeCacheRead(namespace, async () => {
    const value = await redis.get<unknown>(key);
    if (value == null) return null;
    try {
      return decode(value);
    } catch {
      recordCacheOperation(namespace, "error", "error");
      return null;
    }
  });
}

/** 写入指定命名空间下的 JSON 缓存。 */
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

/** 获取缓存版本，用于构造可失效的查询键。 */
export async function getCacheVersion(
  namespace: CacheNamespace,
  key: string,
): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return implicitCacheVersion;
  const raw = await observeCacheRead<number | string>(namespace, async () => {
    return await redis.get<number | string>(key);
  });
  if (raw == null) return implicitCacheVersion;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : implicitCacheVersion;
}

/** 增加缓存版本，使旧查询键自然失效。 */
export async function bumpCacheVersion(
  namespace: CacheNamespace,
  key: string,
): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return implicitCacheVersion;
  try {
    let next = Number(await redis.incr(key));
    if (next === implicitCacheVersion) {
      next = Number(await redis.incr(key));
    }
    recordCacheOperation(namespace, "write", "success");
    return next;
  } catch (error) {
    recordCacheOperation(namespace, "write", "error");
    recordCacheOperation(namespace, "error", "error");
    throw error;
  }
}
