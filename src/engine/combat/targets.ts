import type { Hex, HexDirection } from "../hex";
import { HEX_DIRECTION_COUNT, neighbor } from "../hex";
import type { GameMap } from "../map/types";
import { hexKey } from "../map/types";
import type { CityState } from "../match/cities";
import { entryCost } from "../movement/cost";
import { unitTypeById } from "../unit/catalog";
import type { Unit } from "../unit/types";
import { effectiveCapabilities } from "../unit/types";

export function canAttack(unit: Unit): boolean {
  const type = unitTypeById(unit.typeId);
  if (type === undefined) return false;
  const caps = effectiveCapabilities(type);
  return caps.has("meleeAttack") || caps.has("rangedAttack") || caps.has("bombard");
}

export function attackableHexes(units: readonly Unit[], attackerId: string): readonly Hex[] {
  const attacker = units.find((unit) => unit.id === attackerId);
  if (attacker === undefined || !canAttack(attacker)) return [];
  const targets: Hex[] = [];
  for (let dir = 0; dir < HEX_DIRECTION_COUNT; dir++) {
    const step = neighbor(attacker.hex, dir as HexDirection);
    const enemy = units.find(
      (unit) => hexKey(unit.hex) === hexKey(step) && unit.owner !== attacker.owner,
    );
    if (enemy !== undefined) targets.push(step);
  }
  return targets;
}

export function reachableAttacks(
  units: readonly Unit[],
  movement: Readonly<Record<string, number>>,
  attacker: Unit,
  map: GameMap,
  riverEdges: ReadonlySet<string>,
): readonly Hex[] {
  if (attacker.hasAttackedThisTurn === true) return [];
  const mp = movement[attacker.id] ?? 0;
  return attackableHexes(units, attacker.id).filter((hex) => {
    const cost = entryCost(map, riverEdges, attacker.hex, hex);
    return cost !== null && mp >= cost;
  });
}

export function attackableCityHexes(
  attacker: Unit,
  map: GameMap,
  cities: readonly CityState[],
): readonly Hex[] {
  if (!canAttack(attacker)) return [];
  const targets: Hex[] = [];
  for (let dir = 0; dir < HEX_DIRECTION_COUNT; dir++) {
    const step = neighbor(attacker.hex, dir as HexDirection);
    const cityId = map.hexes.get(hexKey(step))?.cityId;
    if (cityId === undefined) continue;
    const city = cities.find((candidate) => candidate.id === cityId);
    if (city !== undefined && city.owner !== attacker.owner && city.hp > 0) targets.push(step);
  }
  return targets;
}

export function reachableCityAttacks(
  movement: Readonly<Record<string, number>>,
  attacker: Unit,
  map: GameMap,
  riverEdges: ReadonlySet<string>,
  cities: readonly CityState[],
): readonly Hex[] {
  if (attacker.hasAttackedThisTurn === true) return [];
  const mp = movement[attacker.id] ?? 0;
  return attackableCityHexes(attacker, map, cities).filter((hex) => {
    const cost = entryCost(map, riverEdges, attacker.hex, hex);
    return cost !== null && mp >= cost;
  });
}
