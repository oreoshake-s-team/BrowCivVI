import type { Hex, HexDirection } from "../hex";
import { HEX_DIRECTION_COUNT, neighbor } from "../hex";
import type { GameMap } from "../map/types";
import { hexKey } from "../map/types";
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
