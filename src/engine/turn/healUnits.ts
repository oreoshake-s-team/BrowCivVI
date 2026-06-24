import { FULL_HP } from "../combat/resolveCombat";
import type { Unit } from "../unit/types";

export const UNIT_HEAL_RATE = 20;

function actedThisTurn(unit: Unit): boolean {
  return unit.hasMovedThisTurn || unit.hasAttackedThisTurn === true;
}

export function healUnits(units: readonly Unit[], faction: string): readonly Unit[] {
  return units.map((unit) => {
    if (unit.owner !== faction) return unit;
    if (actedThisTurn(unit) || !unit.supplied || unit.hp >= FULL_HP) return unit;
    return { ...unit, hp: Math.min(FULL_HP, unit.hp + UNIT_HEAL_RATE) };
  });
}
