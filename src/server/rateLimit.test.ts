import { beforeEach, describe, expect, it, vi } from "vitest";
import { INTENT_RATE_LIMIT } from "@/content/rateLimits";
import { intentAllowed, isRateLimitConfigured, requestAllowed } from "./rateLimit";

const { limitMock } = vi.hoisted(() => ({ limitMock: vi.fn() }));

vi.mock("@upstash/redis", () => ({ Redis: vi.fn() }));

vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn(() => ({}));
    limit = limitMock;
  },
}));

function configure(): void {
  process.env.KV_REST_API_URL = "https://example.upstash.io";
  process.env.KV_REST_API_TOKEN = "token";
}

beforeEach(() => {
  delete process.env.KV_REST_API_URL;
  delete process.env.KV_REST_API_TOKEN;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  limitMock.mockReset();
});

describe("isRateLimitConfigured", () => {
  it("reads the classic Upstash variable names too", () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
    expect(isRateLimitConfigured()).toBe(true);
  });

  it("is false without the Upstash environment", () => {
    expect(isRateLimitConfigured()).toBe(false);
  });

  it("is true once the Upstash environment is set", () => {
    configure();
    expect(isRateLimitConfigured()).toBe(true);
  });
});

describe("intentAllowed", () => {
  it("allows every intent when Upstash is not configured", async () => {
    expect(await intentAllowed("user-1")).toBe(true);
  });

  it("allows an intent that is within the limit", async () => {
    configure();
    limitMock.mockResolvedValue({ success: true });
    expect(await intentAllowed("user-1")).toBe(true);
  });

  it("denies an intent that exceeds the limit", async () => {
    configure();
    limitMock.mockResolvedValue({ success: false });
    expect(await intentAllowed("user-1")).toBe(false);
  });

  it("rate-limits a burst once the configured budget is exceeded", async () => {
    configure();
    let used = 0;
    limitMock.mockImplementation(() =>
      Promise.resolve({ success: ++used <= INTENT_RATE_LIMIT.requests }),
    );
    const verdicts = await Promise.all(
      Array.from({ length: INTENT_RATE_LIMIT.requests + 1 }, () => intentAllowed("burst-user")),
    );
    expect(verdicts.filter(Boolean)).toHaveLength(INTENT_RATE_LIMIT.requests);
    expect(verdicts.at(-1)).toBe(false);
  });
});

describe("requestAllowed", () => {
  it("allows every request when Upstash is not configured", async () => {
    expect(await requestAllowed("user-1")).toBe(true);
  });

  it("denies a request that exceeds the broader limit", async () => {
    configure();
    limitMock.mockResolvedValue({ success: false });
    expect(await requestAllowed("user-1")).toBe(false);
  });
});
