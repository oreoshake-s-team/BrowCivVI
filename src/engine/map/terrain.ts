import type { MovementDomain } from "../unit/classes";

export type TerrainType =
  | "plains"
  | "hills"
  | "forest"
  | "marsh"
  | "desert"
  | "mountain"
  | "coast"
  | "deepSea";

export interface Terrain {
  readonly id: TerrainType;
  readonly moveCost: number;
  readonly defenseModifier: number;
  readonly passableBy: readonly MovementDomain[];
}

export const TERRAIN_CATALOG: Readonly<Record<TerrainType, Terrain>> = {
  plains: { id: "plains", moveCost: 1, defenseModifier: 0, passableBy: ["land"] },
  hills: { id: "hills", moveCost: 2, defenseModifier: 0.25, passableBy: ["land"] },
  forest: { id: "forest", moveCost: 2, defenseModifier: 0.25, passableBy: ["land"] },
  marsh: { id: "marsh", moveCost: 2, defenseModifier: -0.1, passableBy: ["land"] },
  desert: { id: "desert", moveCost: 2, defenseModifier: 0, passableBy: ["land"] },
  mountain: { id: "mountain", moveCost: Infinity, defenseModifier: 0, passableBy: [] },
  coast: { id: "coast", moveCost: 1, defenseModifier: 0, passableBy: ["naval"] },
  deepSea: { id: "deepSea", moveCost: Infinity, defenseModifier: 0, passableBy: [] },
};

export function isImpassable(terrain: Terrain): boolean {
  return terrain.passableBy.length === 0;
}

export function isRough(terrain: Terrain): boolean {
  return Number.isFinite(terrain.moveCost) && terrain.moveCost > 1;
}

export function passableBy(terrain: Terrain, domain: MovementDomain): boolean {
  return terrain.passableBy.includes(domain);
}

export function blocksLand(type: TerrainType): boolean {
  return !TERRAIN_CATALOG[type].passableBy.includes("land");
}
