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
