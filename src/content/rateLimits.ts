export interface IntentRateLimit {
  readonly requests: number;
  readonly window: `${number} s`;
}

export const INTENT_RATE_LIMIT: IntentRateLimit = { requests: 30, window: "10 s" };
