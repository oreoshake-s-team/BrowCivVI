import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "./relativeTime";

const NOW = 1_000_000_000_000;

describe("formatRelativeTime", () => {
  it("reports a fresh timestamp as just now", () => {
    expect(formatRelativeTime(NOW - 30_000, NOW)).toBe("just now");
  });

  it("reports a single minute without pluralising", () => {
    expect(formatRelativeTime(NOW - 60_000, NOW)).toBe("1 minute ago");
  });

  it("reports several hours", () => {
    expect(formatRelativeTime(NOW - 3 * 60 * 60_000, NOW)).toBe("3 hours ago");
  });

  it("reports whole days", () => {
    expect(formatRelativeTime(NOW - 2 * 24 * 60 * 60_000, NOW)).toBe("2 days ago");
  });

  it("clamps a future timestamp to just now", () => {
    expect(formatRelativeTime(NOW + 60_000, NOW)).toBe("just now");
  });
});
