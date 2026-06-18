import type { UnitType } from "./types";

export const SETTLER: UnitType = {
  id: "settler",
  name: "Settler",
  class: "civilian",
  movement: 2,
  strength: 0,
  capabilities: ["settle"],
};

export const PHALANGITE: UnitType = {
  id: "pezhetairos",
  name: "Pezhetairos",
  class: "melee",
  movement: 2,
  strength: 40,
  abilities: ["phalanx"],
};

export const ARCHER: UnitType = {
  id: "archer",
  name: "Archer",
  class: "ranged",
  movement: 2,
  strength: 25,
};

export const CATAPULT: UnitType = {
  id: "catapult",
  name: "Catapult",
  class: "siege",
  movement: 1,
  strength: 35,
};

export const GREAT_GENERAL: UnitType = {
  id: "great-general",
  name: "Great General",
  class: "support",
  movement: 3,
  strength: 0,
};
