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

export type StackingLayer = "military" | "civilian";

export function stackingLayerForClass(unitClass: UnitClass): StackingLayer {
  return unitClass === "civilian" ? "civilian" : "military";
}

const CAVALRY_CLASSES: ReadonlySet<UnitClass> = new Set<UnitClass>([
  "lightCavalry",
  "heavyCavalry",
]);

export function ignoresZoneOfControl(unitClass: UnitClass): boolean {
  return CAVALRY_CLASSES.has(unitClass);
}
