import { describe, it, expect } from "vitest";
import { FIRST_SLICE_MAP } from "@/content/firstSlice";
import type { Point } from "@/engine/map/layout";
import { coastSegmentPoints, riverSegmentPoints } from "./geometry";

const SIZE = 36;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

describe("riverSegmentPoints", () => {
  it("returns two endpoints", () => {
    expect(riverSegmentPoints({ q: 0, r: 0 }, { q: 1, r: 0 }, 10)).toHaveLength(2);
  });

  it("centers the segment between the two hexes", () => {
    const [a, b] = riverSegmentPoints({ q: 0, r: 0 }, { q: 1, r: 0 }, 10);
    expect((a.x + b.x) / 2).toBeCloseTo(10 * Math.sqrt(3) * 0.5);
  });
});

describe("coastSegmentPoints", () => {
  it("offsets the segment toward the land hex", () => {
    const river = riverSegmentPoints({ q: 0, r: 0 }, { q: 1, r: 0 }, SIZE);
    const coast = coastSegmentPoints({ q: 0, r: 0 }, { q: 1, r: 0 }, SIZE, SIZE * 0.1);
    const riverMid = (river[0].x + river[1].x) / 2;
    const coastMid = (coast[0].x + coast[1].x) / 2;
    expect(coastMid).toBeLessThan(riverMid);
  });
});

describe("Granicus river rendering", () => {
  it("renders the authored Granicus as one connected course", () => {
    const segments = FIRST_SLICE_MAP.rivers.map((river) =>
      riverSegmentPoints(river.a, river.b, SIZE),
    );
    const touches = (s: readonly Point[], t: readonly Point[]) =>
      s.some((p) => t.some((q) => distance(p, q) < SIZE * 0.3));
    const seen = new Set<number>([0]);
    const queue = [0];
    while (queue.length > 0) {
      const current = queue.shift()!;
      segments.forEach((other, index) => {
        if (!seen.has(index) && touches(segments[current]!, other)) {
          seen.add(index);
          queue.push(index);
        }
      });
    }
    expect(seen.size).toBe(segments.length);
  });
});
