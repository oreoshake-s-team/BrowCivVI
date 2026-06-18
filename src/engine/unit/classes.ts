export type MovementDomain = "land" | "naval";

export type UnitClass =
  | "civilian"
  | "recon"
  | "melee"
  | "ranged"
  | "antiCavalry"
  | "lightCavalry"
  | "heavyCavalry"
  | "siege"
  | "navalMelee"
  | "navalRanged"
  | "navalRaider"
  | "support";

const NAVAL_CLASSES: ReadonlySet<UnitClass> = new Set<UnitClass>([
  "navalMelee",
  "navalRanged",
  "navalRaider",
]);

export function domainForClass(unitClass: UnitClass): MovementDomain {
  return NAVAL_CLASSES.has(unitClass) ? "naval" : "land";
}
