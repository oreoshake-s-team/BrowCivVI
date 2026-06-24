import { describe, it, expect } from "vitest";
import { hexToPixel, hexCorners, hexPolygonPoints, mapPixelBounds, pixelBoundsOf } from "./layout";
import { SAMPLE_MAP } from "./sample";

describe("hexToPixel", () => {
  it("places the origin hex at the pixel origin", () => {
    expect(hexToPixel({ q: 0, r: 0 }, 10)).toEqual({ x: 0, y: 0 });
  });

  it("offsets a row by 3/2 * size vertically", () => {
    expect(hexToPixel({ q: 0, r: 1 }, 10).y).toBeCloseTo(15);
  });

  it("keeps even rows vertically aligned (no cumulative slant)", () => {
    expect(hexToPixel({ q: 0, r: 2 }, 10).x).toBeCloseTo(0);
  });

  it("staggers odd rows by half a hex", () => {
    expect(hexToPixel({ q: 0, r: 1 }, 10).x).toBeCloseTo(10 * Math.sqrt(3) * 0.5);
  });
});

describe("hexCorners", () => {
  it("returns six corners", () => {
    expect(hexCorners({ x: 0, y: 0 }, 10)).toHaveLength(6);
  });
});

describe("hexPolygonPoints", () => {
  it("emits six space-separated coordinate pairs", () => {
    expect(hexPolygonPoints({ x: 0, y: 0 }, 10).split(" ")).toHaveLength(6);
  });
});

describe("mapPixelBounds", () => {
  it("produces a finite bounding box for the sample map", () => {
    expect(Number.isFinite(mapPixelBounds(SAMPLE_MAP, 10).maxX)).toBe(true);
  });
});

describe("pixelBoundsOf", () => {
  it("frames a subset of hexes tighter than the full map", () => {
    const subset = pixelBoundsOf([{ q: 1, r: 1 }], 10);
    const whole = mapPixelBounds(SAMPLE_MAP, 10);
    expect(subset.maxX - subset.minX).toBeLessThan(whole.maxX - whole.minX);
  });

  it("returns an empty (infinite) box for no hexes", () => {
    expect(pixelBoundsOf([], 10).minX).toBe(Infinity);
  });
});
