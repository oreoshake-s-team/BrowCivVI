import type { Unit } from "../unit/types";
import type { City, GameMap, MapHex, RiverEdge } from "./types";
import { createGameMap } from "./types";

const HEXES: readonly MapHex[] = [
  { hex: { q: 0, r: 0 }, terrain: "coast" },
  { hex: { q: 1, r: 0 }, terrain: "plains" },
  { hex: { q: 2, r: 0 }, terrain: "plains" },
  { hex: { q: 0, r: 1 }, terrain: "plains" },
  { hex: { q: 1, r: 1 }, terrain: "plains" },
  { hex: { q: 2, r: 1 }, terrain: "hills" },
  { hex: { q: 3, r: 1 }, terrain: "hills", cityId: "dascylium" },
  { hex: { q: 1, r: 2 }, terrain: "mountain" },
  { hex: { q: 2, r: 2 }, terrain: "plains" },
];

const CITIES: readonly City[] = [
  { id: "dascylium", name: "Dascylium", hex: { q: 3, r: 1 }, owner: "persia", value: 100, defense: 20 },
];

const RIVERS: readonly RiverEdge[] = [{ a: { q: 1, r: 1 }, b: { q: 2, r: 1 } }];

export const SAMPLE_MAP: GameMap = createGameMap(HEXES, CITIES, RIVERS);

export const SAMPLE_UNITS: readonly Unit[] = [
  {
    id: "macedon-phalanx-1",
    typeId: "pezhetairos",
    owner: "macedon",
    hex: { q: 1, r: 1 },
    facing: 0,
    hp: 100,
    morale: 80,
    supplied: true,
    hasMovedThisTurn: false,
  },
  {
    id: "persia-cavalry-1",
    typeId: "persian-cavalry",
    owner: "persia",
    hex: { q: 2, r: 1 },
    facing: 3,
    hp: 100,
    morale: 70,
    supplied: true,
    hasMovedThisTurn: false,
  },
];
