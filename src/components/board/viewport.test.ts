import { describe, it, expect } from "vitest";
import { fitView, panView, zoomView, MIN_SPAN } from "./viewport";

describe("fitView", () => {
  it("pads the bounds into a viewBox", () => {
    expect(fitView({ minX: 0, minY: 0, maxX: 100, maxY: 50 }, 10)).toEqual({
      x: -10,
      y: -10,
      w: 120,
      h: 70,
    });
  });
});

describe("panView", () => {
  it("shifts the viewBox opposite the drag", () => {
    expect(panView({ x: 0, y: 0, w: 100, h: 100 }, 10, 5)).toEqual({
      x: -10,
      y: -5,
      w: 100,
      h: 100,
    });
  });
});

describe("zoomView", () => {
  it("shrinks the span when zooming in", () => {
    expect(zoomView({ x: 0, y: 0, w: 800, h: 800 }, 0.5, 400, 400, 2000).w).toBe(400);
  });

  it("keeps the zoom center stationary", () => {
    const view = zoomView({ x: 0, y: 0, w: 800, h: 800 }, 0.5, 400, 400, 2000);
    expect(view.x + view.w / 2).toBe(400);
  });

  it("clamps zoom-in at the minimum span", () => {
    expect(zoomView({ x: 0, y: 0, w: 200, h: 200 }, 0.05, 100, 100, 400).w).toBe(MIN_SPAN);
  });

  it("clamps zoom-out at the maximum span", () => {
    expect(zoomView({ x: 0, y: 0, w: 200, h: 200 }, 5, 100, 100, 300).w).toBe(300);
  });
});
