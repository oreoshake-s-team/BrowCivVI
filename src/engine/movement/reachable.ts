import type { Hex, HexDirection } from "../hex";
import { HEX_DIRECTION_COUNT, neighbor } from "../hex";
import type { GameMap } from "../map/types";
import { hexKey, terrainAt } from "../map/types";
import type { MovementDomain } from "../unit/classes";
import { RIVER_CROSS_COST, riverEdgeKey, roadEdgeSets, roadStepCost } from "./cost";

export interface ReachableInput {
  readonly start: Hex;
  readonly movement: number;
  readonly map: GameMap;
  readonly domain: MovementDomain;
  readonly blocked?: ReadonlySet<string>;
  readonly blockedDestinations?: ReadonlySet<string>;
  readonly zoneOfControl?: ReadonlySet<string>;
  readonly riverEdges?: ReadonlySet<string>;
  readonly atFullMovement?: boolean;
}

export function reachableHexes(input: ReachableInput): ReadonlyMap<string, number> {
  const { start, movement, map, domain, blocked, blockedDestinations, zoneOfControl, riverEdges } =
    input;
  const startKey = hexKey(start);
  const roads = roadEdgeSets(map.roads);
  const best = new Map<string, number>([[startKey, movement]]);
  let frontier: Hex[] = [start];

  while (frontier.length > 0) {
    const next: Hex[] = [];
    for (const hex of frontier) {
      const budget = best.get(hexKey(hex));
      if (budget === undefined) continue;
      for (let dir = 0; dir < HEX_DIRECTION_COUNT; dir++) {
        const step = neighbor(hex, dir as HexDirection);
        const key = hexKey(step);
        if (blocked?.has(key)) continue;
        const terrain = terrainAt(map, step);
        if (!terrain?.passableBy.includes(domain)) continue;
        const edgeKey = riverEdgeKey(hex, step);
        const crossingRiver = riverEdges?.has(edgeKey) ?? false;
        const onRoad = !crossingRiver && roads.road.has(edgeKey);
        const cost = onRoad
          ? roadStepCost(terrain, roads.royal.has(edgeKey))
          : terrain.moveCost + (crossingRiver ? RIVER_CROSS_COST : 0);
        const firstStep = hexKey(hex) === startKey;
        const minimumStep = firstStep && (input.atFullMovement ?? false);
        if (budget - cost < 0 && !minimumStep) continue;
        const remaining = Math.max(0, budget - cost);
        const inZoneOfControl = zoneOfControl?.has(key) ?? false;
        const prev = best.get(key);
        if (prev === undefined || remaining > prev) {
          best.set(key, remaining);
          if (!inZoneOfControl) next.push(step);
        }
      }
    }
    frontier = next;
  }

  best.delete(startKey);
  if (blockedDestinations) {
    for (const key of blockedDestinations) best.delete(key);
  }
  return best;
}
