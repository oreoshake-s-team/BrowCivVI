import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { INTENT_RATE_LIMIT, REQUEST_RATE_LIMIT, type RateLimit } from "@/content/rateLimits";

function redisCredentials(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url !== undefined && token !== undefined ? { url, token } : null;
}

export function isRateLimitConfigured(): boolean {
  return redisCredentials() !== null;
}

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

function limiterFor(prefix: string, config: RateLimit): Ratelimit | null {
  const credentials = redisCredentials();
  if (credentials === null) return null;
  redis ??= new Redis(credentials);
  let limiter = limiters.get(prefix);
  if (limiter === undefined) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      prefix,
    });
    limiters.set(prefix, limiter);
  }
  return limiter;
}

async function allowed(prefix: string, config: RateLimit, key: string): Promise<boolean> {
  const limiter = limiterFor(prefix, config);
  if (limiter === null) return true;
  const { success } = await limiter.limit(key);
  return success;
}

export function intentAllowed(userId: string): Promise<boolean> {
  return allowed("intent", INTENT_RATE_LIMIT, userId);
}

export function requestAllowed(userId: string): Promise<boolean> {
  return allowed("request", REQUEST_RATE_LIMIT, userId);
}
