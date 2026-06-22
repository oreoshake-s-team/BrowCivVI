import type { Hex } from "../hex";
import type { Terrain } from "../map/terrain";
import type { GameMap, RiverEdge, RoadEdge } from "../map/types";
import { hexKey, terrainAt } from "../map/types";

export const RIVER_CROSS_COST = 2;
export const ROYAL_ROAD_DIVISOR = 2;
const ROAD_SMOOTHED_TERRAINS: ReadonlySet<string> = new Set(["hills", "forest"]);

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

export interface RoadEdgeSets {
  readonly road: ReadonlySet<string>;
  readonly royal: ReadonlySet<string>;
}

export function roadEdgeSets(roads: readonly RoadEdge[]): RoadEdgeSets {
  const road = new Set<string>();
  const royal = new Set<string>();
  for (const edge of roads) {
    const key = riverEdgeKey(edge.a, edge.b);
    road.add(key);
    if (edge.royal === true) royal.add(key);
  }
  return { road, royal };
}

export function roadStepCost(terrain: Terrain, royal: boolean): number {
  const base = ROAD_SMOOTHED_TERRAINS.has(terrain.id) ? 1 : terrain.moveCost;
  return royal ? base / ROYAL_ROAD_DIVISOR : base;
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
