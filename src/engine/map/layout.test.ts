import { describe, it, expect } from "vitest";
import { hexToPixel, hexCorners, hexPolygonPoints, mapPixelBounds } from "./layout";
import { SAMPLE_MAP } from "./sample";

describe("hexToPixel", () => {
  it("places the origin hex at the pixel origin", () => {
    expect(hexToPixel({ q: 0, r: 0 }, 10)).toEqual({ x: 0, y: 0 });
  });

  it("offsets a row by 3/2 * size vertically", () => {
    expect(hexToPixel({ q: 0, r: 1 }, 10).y).toBeCloseTo(15);
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
