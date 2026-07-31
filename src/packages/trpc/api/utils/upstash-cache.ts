import "server-only";

import { Redis } from "@upstash/redis";
import { getUpstashEnv } from "@/env/server";

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

export async function getCacheJSON<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  return await redis.get<T>(key);
}

export async function setCacheJSON<T>(
  key: string,
  value: T,
  expireSeconds: number,
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  await redis.set(key, value, { ex: expireSeconds });
}

export async function getCacheVersion(key: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 1;

  const raw = await redis.get<number | string>(key);
  if (raw == null) return 1;

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export async function bumpCacheVersion(key: string): Promise<number> {
  const redis = getRedisClient();
  if (!redis) return 1;

  const next = await redis.incr(key);
  return Number(next);
}
