import { describe, it, expect } from "vitest";
import { riverSegmentPoints } from "./geometry";

describe("riverSegmentPoints", () => {
  it("returns two endpoints", () => {
    expect(riverSegmentPoints({ q: 0, r: 0 }, { q: 1, r: 0 }, 10)).toHaveLength(2);
  });

  it("centers the segment between the two hexes", () => {
    const [a, b] = riverSegmentPoints({ q: 0, r: 0 }, { q: 1, r: 0 }, 10);
    expect((a.x + b.x) / 2).toBeCloseTo(10 * Math.sqrt(3) * 0.5);
  });
});
