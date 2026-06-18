import type { UnitClass } from "./classes";

export type UnitCapability =
  | "move"
  | "meleeAttack"
  | "rangedAttack"
  | "bombard"
  | "settle"
  | "siegeSupport"
  | "heal";

export const UNIVERSAL_CAPABILITIES: readonly UnitCapability[] = ["move", "heal"];

export const CLASS_CAPABILITIES: Readonly<Record<UnitClass, readonly UnitCapability[]>> = {
  civilian: [],
  recon: ["meleeAttack"],
  melee: ["meleeAttack"],
  ranged: ["rangedAttack"],
  antiCavalry: ["meleeAttack"],
  lightCavalry: ["meleeAttack"],
  heavyCavalry: ["meleeAttack"],
  siege: ["bombard"],
  navalMelee: ["meleeAttack"],
  navalRanged: ["rangedAttack"],
  navalRaider: ["meleeAttack"],
  support: [],
};
