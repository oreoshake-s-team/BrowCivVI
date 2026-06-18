import type { Bounds } from "@/engine/map/layout";

export interface ViewBox {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const MIN_SPAN = 160;

export function fitView(bounds: Bounds, pad: number): ViewBox {
  return {
    x: bounds.minX - pad,
    y: bounds.minY - pad,
    w: bounds.maxX - bounds.minX + pad * 2,
    h: bounds.maxY - bounds.minY + pad * 2,
  };
}

export function panView(view: ViewBox, dx: number, dy: number): ViewBox {
  return { ...view, x: view.x - dx, y: view.y - dy };
}

export function zoomView(view: ViewBox, factor: number, cx: number, cy: number, maxW: number): ViewBox {
  const targetW = Math.min(Math.max(view.w * factor, MIN_SPAN), maxW);
  const k = targetW / view.w;
  return {
    x: cx - (cx - view.x) * k,
    y: cy - (cy - view.y) * k,
    w: view.w * k,
    h: view.h * k,
  };
}

export function viewBoxString(view: ViewBox): string {
  return `${view.x} ${view.y} ${view.w} ${view.h}`;
}
