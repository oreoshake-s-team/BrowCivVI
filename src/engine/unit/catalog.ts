import type { UnitType } from "./types";

export const UNIT_TYPES: Readonly<Record<string, UnitType>> = {
  pezhetairos: {
    id: "pezhetairos",
    name: "Pezhetairos",
    class: "melee",
    movement: 2,
    strength: 40,
    abilities: ["phalanx"],
  },
  "persian-cavalry": {
    id: "persian-cavalry",
    name: "Persian Cavalry",
    class: "heavyCavalry",
    movement: 4,
    strength: 35,
  },
};

export function unitTypeById(id: string): UnitType | undefined {
  return UNIT_TYPES[id];
}
