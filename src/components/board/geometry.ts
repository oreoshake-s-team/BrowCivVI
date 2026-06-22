import type { Hex } from "@/engine/hex";
import type { Point } from "@/engine/map/layout";
import { hexToPixel } from "@/engine/map/layout";

export function riverSegmentPoints(a: Hex, b: Hex, size: number): readonly [Point, Point] {
  const centerA = hexToPixel(a, size);
  const centerB = hexToPixel(b, size);
  const midX = (centerA.x + centerB.x) / 2;
  const midY = (centerA.y + centerB.y) / 2;
  const dx = centerB.x - centerA.x;
  const dy = centerB.y - centerA.y;
  const length = Math.hypot(dx, dy) || 1;
  const perpX = -dy / length;
  const perpY = dx / length;
  const half = size * 0.6;
  return [
    { x: midX + perpX * half, y: midY + perpY * half },
    { x: midX - perpX * half, y: midY - perpY * half },
  ];
}

export function coastSegmentPoints(
  land: Hex,
  water: Hex,
  size: number,
  inset: number,
): readonly [Point, Point] {
  const [p1, p2] = riverSegmentPoints(land, water, size);
  const center = hexToPixel(land, size);
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const towardX = center.x - midX;
  const towardY = center.y - midY;
  const length = Math.hypot(towardX, towardY) || 1;
  const offsetX = (towardX / length) * inset;
  const offsetY = (towardY / length) * inset;
  return [
    { x: p1.x + offsetX, y: p1.y + offsetY },
    { x: p2.x + offsetX, y: p2.y + offsetY },
  ];
}
