import { Redis } from '@upstash/redis';

/** Resolve Redis from common Vercel / Upstash env names. */
export function getRedisFromEnv(): Redis | null {
  try {
    // Prefers UPSTASH_* then falls back to KV_*
    return Redis.fromEnv();
  } catch {
    /* fall through */
  }

  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_TOKEN;

  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function redisEnvProbe() {
  return {
    UPSTASH_REDIS_REST_URL: Boolean(process.env.UPSTASH_REDIS_REST_URL),
    UPSTASH_REDIS_REST_TOKEN: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
    KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL),
    KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN),
  };
}
