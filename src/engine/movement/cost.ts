import type { Hex } from "../hex";
import type { GameMap, RiverEdge } from "../map/types";
import { hexKey, terrainAt } from "../map/types";

export const RIVER_CROSS_COST = 2;

export function riverEdgeKey(a: Hex, b: Hex): string {
  const ka = hexKey(a);
  const kb = hexKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

export function riverEdgeSet(rivers: readonly RiverEdge[]): ReadonlySet<string> {
  const edges = new Set<string>();
  for (const edge of rivers) edges.add(riverEdgeKey(edge.a, edge.b));
  return edges;
}

export function entryCost(
  map: GameMap,
  riverEdges: ReadonlySet<string>,
  from: Hex,
  to: Hex,
): number | null {
  const terrain = terrainAt(map, to);
  if (terrain === undefined) return null;
  const river = riverEdges.has(riverEdgeKey(from, to)) ? RIVER_CROSS_COST : 0;
  return terrain.moveCost + river;
}
