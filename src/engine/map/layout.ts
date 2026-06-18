import type { Hex } from "../hex";
import type { GameMap } from "./types";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export function hexToPixel(hex: Hex, size: number): Point {
  return {
    x: size * Math.sqrt(3) * (hex.q + hex.r / 2),
    y: size * (3 / 2) * hex.r,
  };
}

export function hexCorners(center: Point, size: number): readonly Point[] {
  const corners: Point[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({ x: center.x + size * Math.cos(angle), y: center.y + size * Math.sin(angle) });
  }
  return corners;
}

export function hexPolygonPoints(center: Point, size: number): string {
  return hexCorners(center, size)
    .map((corner) => `${corner.x.toFixed(2)},${corner.y.toFixed(2)}`)
    .join(" ");
}

export function mapPixelBounds(map: GameMap, size: number): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const mapHex of map.hexes.values()) {
    const center = hexToPixel(mapHex.hex, size);
    minX = Math.min(minX, center.x - size);
    maxX = Math.max(maxX, center.x + size);
    minY = Math.min(minY, center.y - size);
    maxY = Math.max(maxY, center.y + size);
  }
  return { minX, minY, maxX, maxY };
}
