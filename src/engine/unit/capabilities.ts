import type { UnitClass } from "./classes";

export type UnitCapability =
  | "move"
  | "meleeAttack"
  | "rangedAttack"
  | "bombard"
  | "settle"
  | "siegeSupport"
  | "heal";

export const DEFAULT_CAPABILITIES: Readonly<Record<UnitClass, readonly UnitCapability[]>> = {
  civilian: ["move"],
  recon: ["move", "meleeAttack"],
  melee: ["move", "meleeAttack"],
  ranged: ["move", "rangedAttack"],
  antiCavalry: ["move", "meleeAttack"],
  lightCavalry: ["move", "meleeAttack"],
  heavyCavalry: ["move", "meleeAttack"],
  siege: ["move", "bombard"],
  navalMelee: ["move", "meleeAttack"],
  navalRanged: ["move", "rangedAttack"],
  navalRaider: ["move", "meleeAttack"],
  support: ["move", "heal"],
};
