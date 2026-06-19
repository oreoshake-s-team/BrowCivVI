import type { Hex, HexDirection } from "../hex";
import { HEX_DIRECTION_COUNT, neighbor } from "../hex";
import type { GameMap } from "../map/types";
import { hexKey, terrainAt } from "../map/types";
import type { MovementDomain } from "../unit/classes";

export interface ReachableInput {
  readonly start: Hex;
  readonly movement: number;
  readonly map: GameMap;
  readonly domain: MovementDomain;
  readonly blocked?: ReadonlySet<string>;
  readonly blockedDestinations?: ReadonlySet<string>;
}

export function reachableHexes(input: ReachableInput): ReadonlyMap<string, number> {
  const { start, movement, map, domain, blocked, blockedDestinations } = input;
  const best = new Map<string, number>([[hexKey(start), movement]]);
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
        const remaining = budget - terrain.moveCost;
        if (remaining < 0) continue;
        const prev = best.get(key);
        if (prev === undefined || remaining > prev) {
          best.set(key, remaining);
          next.push(step);
        }
      }
    }
    frontier = next;
  }

  best.delete(hexKey(start));
  if (blockedDestinations) {
    for (const key of blockedDestinations) best.delete(key);
  }
  return best;
}
