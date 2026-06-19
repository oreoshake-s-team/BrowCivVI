import type { Hex, HexDirection } from "../hex";
import { HEX_DIRECTION_COUNT, neighbor } from "../hex";
import { hexKey } from "../map/types";
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
