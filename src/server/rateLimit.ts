import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { INTENT_RATE_LIMIT, REQUEST_RATE_LIMIT, type RateLimit } from "@/content/rateLimits";

export function isRateLimitConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

let redis: Redis | null = null;
const limiters = new Map<string, Ratelimit>();

function limiterFor(prefix: string, config: RateLimit): Ratelimit | null {
  if (!isRateLimitConfigured()) return null;
  redis ??= Redis.fromEnv();
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
