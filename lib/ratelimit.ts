import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "./redis";

// 10 paste creations per minute per IP
export const createRatelimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
  prefix: "pastevault:create",
});

// 30 paste reads per minute per IP
export const readRatelimit = new Ratelimit({
  redis: getRedis(),
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  analytics: true,
  prefix: "pastevault:read",
});
