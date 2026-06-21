import type { Hex } from "../hex";
import { neighbors } from "../hex";
import { passableBy } from "../map/terrain";
import type { GameMap } from "../map/types";
import { hexKey, terrainAt } from "../map/types";
import type { MatchState } from "../match/state";
import { riverEdgeKey } from "../movement/cost";

export interface SupplyContext {
  readonly map: GameMap;
  readonly riverEdges: ReadonlySet<string>;
}

function enemyHeldHexes(state: MatchState, faction: string, map: GameMap): ReadonlySet<string> {
  const held = new Set<string>();
  for (const unit of state.units) {
    if (unit.owner !== faction) held.add(hexKey(unit.hex));
  }
  for (const city of state.cities) {
    if (city.owner === faction || city.owner === null) continue;
    const mapCity = map.cities.get(city.id);
    if (mapCity !== undefined) held.add(hexKey(mapCity.hex));
  }
  return held;
}

function sourceHexes(state: MatchState, faction: string, map: GameMap): readonly Hex[] {
  const sources: Hex[] = [];
  for (const city of state.cities) {
    if (city.owner !== faction) continue;
    const mapCity = map.cities.get(city.id);
    if (mapCity !== undefined) sources.push(mapCity.hex);
  }
  return sources;
}

function supplyNetwork(
  state: MatchState,
  faction: string,
  ctx: SupplyContext,
): ReadonlySet<string> {
  const scorched = new Set(state.scorched);
  const enemyHeld = enemyHeldHexes(state, faction, ctx.map);
  const reached = new Set<string>();
  const frontier: Hex[] = [];
  for (const source of sourceHexes(state, faction, ctx.map)) {
    const key = hexKey(source);
    if (!reached.has(key)) {
      reached.add(key);
      frontier.push(source);
    }
  }
  while (frontier.length > 0) {
    const current = frontier.shift();
    if (current === undefined) break;
    for (const next of neighbors(current)) {
      const key = hexKey(next);
      if (reached.has(key)) continue;
      const terrain = terrainAt(ctx.map, next);
      if (terrain === undefined || !passableBy(terrain, "land")) continue;
      if (scorched.has(key) || enemyHeld.has(key)) continue;
      if (ctx.riverEdges.has(riverEdgeKey(current, next))) continue;
      reached.add(key);
      frontier.push(next);
    }
  }
  return reached;
}

export function computeSupply(state: MatchState, ctx: SupplyContext): MatchState {
  const networks = new Map<string, ReadonlySet<string>>();
  const networkFor = (faction: string): ReadonlySet<string> => {
    const cached = networks.get(faction);
    if (cached !== undefined) return cached;
    const network = supplyNetwork(state, faction, ctx);
    networks.set(faction, network);
    return network;
  };
  const units = state.units.map((unit) => {
    const supplied = networkFor(unit.owner).has(hexKey(unit.hex));
    return unit.supplied === supplied ? unit : { ...unit, supplied };
  });
  const changed = units.some((unit, index) => unit !== state.units[index]);
  return changed ? { ...state, units } : state;
}
