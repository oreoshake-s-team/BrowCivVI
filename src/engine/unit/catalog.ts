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
  "paphlagonian-cavalry": {
    id: "paphlagonian-cavalry",
    name: "Paphlagonian Cavalry",
    class: "lightCavalry",
    movement: 5,
    strength: 24,
    hitAndRun: true,
  },
  hetairoi: {
    id: "hetairoi",
    name: "Hetairoi",
    class: "heavyCavalry",
    movement: 4,
    strength: 38,
  },
  immortal: {
    id: "immortal",
    name: "Immortal",
    class: "melee",
    movement: 2,
    strength: 36,
  },
};

export function unitTypeById(id: string): UnitType | undefined {
  return UNIT_TYPES[id];
}
