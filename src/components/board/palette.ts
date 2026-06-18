import type { TerrainType } from "@/engine/map/terrain";
import type { UnitClass } from "@/engine/unit/classes";

export const TERRAIN_COLORS: Readonly<Record<TerrainType, string>> = {
  plains: "#cfe3a3",
  hills: "#c4ad74",
  forest: "#6b8f57",
  marsh: "#7fa8a0",
  desert: "#e6d3a3",
  mountain: "#8a8a8a",
  coast: "#9fc6e0",
  deepSea: "#4a7fb0",
};

export const TERRAIN_LABELS: Readonly<Record<TerrainType, string>> = {
  plains: "Plains",
  hills: "Hills",
  forest: "Forest",
  marsh: "Marsh",
  desert: "Desert",
  mountain: "Mountain",
  coast: "Coast",
  deepSea: "Deep sea",
};

export const CLASS_GLYPHS: Readonly<Record<UnitClass, string>> = {
  civilian: "•",
  recon: "S",
  melee: "M",
  ranged: "R",
  antiCavalry: "A",
  lightCavalry: "L",
  heavyCavalry: "C",
  siege: "E",
  navalMelee: "N",
  navalRanged: "B",
  navalRaider: "D",
  support: "H",
};

export interface FactionStyle {
  readonly fill: string;
  readonly stroke: string;
  readonly text: string;
}

const FACTION_STYLES: Readonly<Record<string, FactionStyle>> = {
  macedon: { fill: "#d4af37", stroke: "#7a5c00", text: "#3a2c00" },
  persia: { fill: "#a01f2e", stroke: "#5e0f18", text: "#ffffff" },
};

const NEUTRAL_STYLE: FactionStyle = { fill: "#9aa0a6", stroke: "#5f6368", text: "#ffffff" };

export function factionStyle(owner: string | null): FactionStyle {
  if (owner === null) return NEUTRAL_STYLE;
  return FACTION_STYLES[owner] ?? NEUTRAL_STYLE;
}
