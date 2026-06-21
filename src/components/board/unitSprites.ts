import type { UnitClass } from "@/engine/unit/classes";

export const UNIT_SPRITE_VIEWBOX = "0 0 24 24";

const SPRITE_ID_PREFIX = "unit-sprite";

export function spriteIdForClass(unitClass: UnitClass): string {
  return `${SPRITE_ID_PREFIX}-${unitClass}`;
}

export const UNIT_SPRITE_PATHS: Readonly<Record<UnitClass, string>> = {
  civilian: "M12 3a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4zM6.5 21v-4.6a5.5 5.5 0 0 1 11 0V21z",
  recon: "M7 2.5h1.9V21.5H7zM8.9 3.6l9.1 2.8-9.1 2.8z",
  melee: "M12 2l2.5 5.6H9.5zM11 7.6h2V22h-2z",
  ranged:
    "M8.4 3a1 1 0 0 1 .9 1.5 9.5 9.5 0 0 0 0 11 1 1 0 0 1-1.7 1A11.5 11.5 0 0 1 7.5 4 1 1 0 0 1 8.4 3zM10 11.2h6.2L14 9l1.3-1.3L20 12l-4.7 4.3L14 15l2.2-2.2H10z",
  antiCavalry: "M5.5 4.1 4.1 5.5 17.4 18.9 18.8 17.5zM18.5 4.1 4.6 18 6 19.4 19.9 5.5z",
  lightCavalry: "M6 4h3v9a3 3 0 0 0 6 0V4h3v9a6 6 0 0 1-12 0z",
  heavyCavalry: "M5 4h3v9a4 4 0 0 0 8 0V4h3v9a7 7 0 0 1-14 0zM12 8.2l2.4 2.4-2.4 2.4-2.4-2.4z",
  siege: "M3 20 12 6.5 21 20h-4.3L12 13.3 7.3 20z",
  navalMelee: "M11.2 3h1.6v9h-1.6zM3.5 13.5h17L17.6 20H6.4z",
  navalRanged: "M11.4 3h1.2v10h-1.2zM12.8 4h6.4l-6.4 5.4zM3.5 14h17L17.6 20H6.4z",
  navalRaider:
    "M12.8 3.4h5.6L12.8 8.4zM5.6 3.4H11.2L5.6 8.4zM11.2 3h1.6v10h-1.6zM3.5 14h17L17.6 20H6.4z",
  support:
    "M11.2 2h1.6V22h-1.6zM12 2.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2zM6 6.5h12v5l-3-1.6-3 1.6-3-1.6L6 11.5z",
};

export function hasUnitSprite(unitClass: UnitClass | undefined): unitClass is UnitClass {
  return unitClass !== undefined && unitClass in UNIT_SPRITE_PATHS;
}
