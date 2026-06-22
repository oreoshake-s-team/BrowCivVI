import type { Citation } from "../content/citation";
import type { MediaLink } from "../content/media";
import type { Hex } from "../hex";
import type { Terrain, TerrainType } from "./terrain";
import { TERRAIN_CATALOG } from "./terrain";

export type Affinity = "macedon" | "persia" | "neutral";

export function hexKey(hex: Hex): string {
  return `${hex.q},${hex.r}`;
}

export function parseHexKey(key: string): Hex {
  const [q, r] = key.split(",");
  return { q: Number(q), r: Number(r) };
}

export interface MapHex {
  readonly hex: Hex;
  readonly terrain: TerrainType;
  readonly cityId?: string;
}

export interface City {
  readonly id: string;
  readonly name: string;
  readonly hex: Hex;
  readonly owner: string | null;
  readonly value: number;
  readonly defense: number;
  readonly walls?: boolean;
  readonly affinity?: Affinity;
  readonly citation?: Citation;
  readonly media?: readonly MediaLink[];
  readonly firstAttestedBce?: number;
}

export interface RiverEdge {
  readonly a: Hex;
  readonly b: Hex;
}

export interface GameMap {
  readonly hexes: ReadonlyMap<string, MapHex>;
  readonly cities: ReadonlyMap<string, City>;
  readonly rivers: readonly RiverEdge[];
}

export function createGameMap(
  hexes: readonly MapHex[],
  cities: readonly City[],
  rivers: readonly RiverEdge[] = [],
): GameMap {
  const hexIndex = new Map<string, MapHex>();
  for (const mapHex of hexes) hexIndex.set(hexKey(mapHex.hex), mapHex);
  const cityIndex = new Map<string, City>();
  for (const city of cities) cityIndex.set(city.id, city);
  return { hexes: hexIndex, cities: cityIndex, rivers };
}

export function mapHexAt(map: GameMap, hex: Hex): MapHex | undefined {
  return map.hexes.get(hexKey(hex));
}

export function terrainAt(map: GameMap, hex: Hex): Terrain | undefined {
  const mapHex = map.hexes.get(hexKey(hex));
  return mapHex ? TERRAIN_CATALOG[mapHex.terrain] : undefined;
}
