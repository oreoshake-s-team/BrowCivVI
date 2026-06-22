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
  "cretan-archers": {
    id: "cretan-archers",
    name: "Cretan Archers",
    class: "ranged",
    movement: 2,
    strength: 25,
  },
  "persian-archers": {
    id: "persian-archers",
    name: "Persian Archers",
    class: "ranged",
    movement: 2,
    strength: 22,
  },
  "siege-train": {
    id: "siege-train",
    name: "Siege Train",
    class: "siege",
    movement: 1,
    strength: 20,
  },
};

export function unitTypeById(id: string): UnitType | undefined {
  return UNIT_TYPES[id];
}
