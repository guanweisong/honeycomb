import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;
let initialized = false;

function getRedisClient(): Redis | null {
  if (initialized) return redisClient;
  initialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
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
