import { Redis } from "@upstash/redis";

// Lazy singleton — avoids build-time errors when env vars aren't set yet
let _redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!_redisInstance) {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error(
        "Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN.\n" +
        "Sign up for free at https://upstash.com and add them to .env.local"
      );
    }
    _redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return _redisInstance;
}
