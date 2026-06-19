import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { INTENT_RATE_LIMIT } from "@/content/rateLimits";

export function isRateLimitConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

let limiter: Ratelimit | null = null;

function intentLimiter(): Ratelimit | null {
  if (!isRateLimitConfigured()) return null;
  limiter ??= new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(INTENT_RATE_LIMIT.requests, INTENT_RATE_LIMIT.window),
    prefix: "intent",
  });
  return limiter;
}

export async function intentAllowed(userId: string): Promise<boolean> {
  const rl = intentLimiter();
  if (rl === null) return true;
  const { success } = await rl.limit(userId);
  return success;
}
