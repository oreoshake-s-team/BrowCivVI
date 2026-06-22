import type { Hex } from "../hex";
import { hexDistance } from "../hex";
import type { GameMap } from "../map/types";
import { hexKey } from "../map/types";
import type { CityState } from "../match/cities";
import { entryCost } from "../movement/cost";
import { unitTypeById } from "../unit/catalog";
import type { Unit } from "../unit/types";
import { effectiveCapabilities } from "../unit/types";
import { attackRange, isRangedAttacker } from "./range";

export function canAttack(unit: Unit): boolean {
  const type = unitTypeById(unit.typeId);
  if (type === undefined) return false;
  const caps = effectiveCapabilities(type);
  return caps.has("meleeAttack") || caps.has("rangedAttack") || caps.has("bombard");
}

function inRange(from: Hex, to: Hex, range: number): boolean {
  const distance = hexDistance(from, to);
  return distance >= 1 && distance <= range;
}

function isShieldedGarrison(unit: Unit, map: GameMap, cities: readonly CityState[]): boolean {
  const cityId = map.hexes.get(hexKey(unit.hex))?.cityId;
  if (cityId === undefined) return false;
  const city = cities.find((candidate) => candidate.id === cityId);
  if (city === undefined) return false;
  return city.owner === unit.owner && city.hp > 0;
}

export function attackableHexes(
  units: readonly Unit[],
  attackerId: string,
  map: GameMap,
  cities: readonly CityState[],
): readonly Hex[] {
  const attacker = units.find((unit) => unit.id === attackerId);
  if (attacker === undefined || !canAttack(attacker)) return [];
  const type = unitTypeById(attacker.typeId);
  if (type === undefined) return [];
  const range = attackRange(type);
  return units
    .filter(
      (unit) =>
        unit.owner !== attacker.owner &&
        inRange(attacker.hex, unit.hex, range) &&
        !isShieldedGarrison(unit, map, cities),
    )
    .map((unit) => unit.hex);
}

export function reachableAttacks(
  units: readonly Unit[],
  movement: Readonly<Record<string, number>>,
  attacker: Unit,
  map: GameMap,
  riverEdges: ReadonlySet<string>,
  cities: readonly CityState[],
): readonly Hex[] {
  if (attacker.hasAttackedThisTurn === true) return [];
  const type = unitTypeById(attacker.typeId);
  if (type === undefined) return [];
  const mp = movement[attacker.id] ?? 0;
  const targets = attackableHexes(units, attacker.id, map, cities);
  if (isRangedAttacker(type)) return mp > 0 ? targets : [];
  return targets.filter((hex) => {
    const cost = entryCost(map, riverEdges, attacker.hex, hex);
    return cost !== null && mp >= cost;
  });
}

export function attackableCityHexes(
  attacker: Unit,
  map: GameMap,
  cities: readonly CityState[],
): readonly Hex[] {
  const type = unitTypeById(attacker.typeId);
  if (type === undefined || !canAttack(attacker)) return [];
  const range = attackRange(type);
  const cityById = new Map(cities.map((city) => [city.id, city] as const));
  const targets: Hex[] = [];
  for (const mapHex of map.hexes.values()) {
    if (mapHex.cityId === undefined || !inRange(attacker.hex, mapHex.hex, range)) continue;
    const city = cityById.get(mapHex.cityId);
    if (city !== undefined && city.owner !== attacker.owner && city.hp > 0)
      targets.push(mapHex.hex);
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
  const type = unitTypeById(attacker.typeId);
  if (type === undefined) return [];
  const mp = movement[attacker.id] ?? 0;
  const targets = attackableCityHexes(attacker, map, cities);
  if (isRangedAttacker(type)) return mp > 0 ? targets : [];
  return targets.filter((hex) => {
    const cost = entryCost(map, riverEdges, attacker.hex, hex);
    return cost !== null && mp >= cost;
  });
}
