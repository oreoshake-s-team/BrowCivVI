export interface RateLimit {
  readonly requests: number;
  readonly window: `${number} s`;
}

export const INTENT_RATE_LIMIT: RateLimit = { requests: 30, window: "10 s" };

export const REQUEST_RATE_LIMIT: RateLimit = { requests: 120, window: "10 s" };
