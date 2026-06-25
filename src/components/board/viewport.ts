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

export function lockedView(
  boxW: number,
  boxH: number,
  scale: number,
  center: { readonly x: number; readonly y: number },
  content: Bounds,
  pad: number,
): ViewBox {
  const w = Math.max(boxW / scale, content.maxX - content.minX + pad * 2);
  const h = Math.max(boxH / scale, content.maxY - content.minY + pad * 2);
  return { x: center.x - w / 2, y: center.y - h / 2, w, h };
}

export function panView(view: ViewBox, dx: number, dy: number): ViewBox {
  return { ...view, x: view.x - dx, y: view.y - dy };
}

export function zoomView(
  view: ViewBox,
  factor: number,
  cx: number,
  cy: number,
  maxW: number,
): ViewBox {
  const targetW = Math.min(Math.max(view.w * factor, MIN_SPAN), maxW);
  const k = targetW / view.w;
  return {
    x: cx - (cx - view.x) * k,
    y: cy - (cy - view.y) * k,
    w: view.w * k,
    h: view.h * k,
  };
}

export function centerViewOn(view: ViewBox, cx: number, cy: number): ViewBox {
  return { ...view, x: cx - view.w / 2, y: cy - view.h / 2 };
}

export function lerpView(from: ViewBox, to: ViewBox, t: number): ViewBox {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
    w: from.w + (to.w - from.w) * t,
    h: from.h + (to.h - from.h) * t,
  };
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

export function viewBoxString(view: ViewBox): string {
  return `${view.x} ${view.y} ${view.w} ${view.h}`;
}
