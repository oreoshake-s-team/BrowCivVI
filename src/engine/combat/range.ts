import type { UnitType } from "../unit/types";
import { effectiveCapabilities } from "../unit/types";

export const MELEE_RANGE = 1;
export const RANGED_RANGE = 2;

export const SIEGE_CITY_STRENGTH_BONUS = 0.5;

export function isRangedAttacker(type: UnitType): boolean {
  const caps = effectiveCapabilities(type);
  return caps.has("rangedAttack") || caps.has("bombard");
}

export function isBombardAttacker(type: UnitType): boolean {
  return effectiveCapabilities(type).has("bombard");
}

export function attackRange(type: UnitType): number {
  if (type.range !== undefined) return type.range;
  return isRangedAttacker(type) ? RANGED_RANGE : MELEE_RANGE;
}

export function siegeCityMultiplier(bombard: boolean): number {
  return bombard ? 1 + SIEGE_CITY_STRENGTH_BONUS : 1;
}
