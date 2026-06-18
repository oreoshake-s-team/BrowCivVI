import type { TerrainType } from "@/engine/map/terrain";
import type { UnitClass } from "@/engine/unit/classes";

export const TERRAIN_COLORS: Readonly<Record<TerrainType, string>> = {
  plains: "var(--color-terrain-plains)",
  hills: "var(--color-terrain-hills)",
  forest: "var(--color-terrain-forest)",
  marsh: "var(--color-terrain-marsh)",
  desert: "var(--color-terrain-desert)",
  mountain: "var(--color-terrain-mountain)",
  coast: "var(--color-terrain-coast)",
  deepSea: "var(--color-terrain-deep-sea)",
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
  macedon: {
    fill: "var(--faction-macedon-fill)",
    stroke: "var(--faction-macedon-stroke)",
    text: "var(--faction-macedon-text)",
  },
  persia: {
    fill: "var(--faction-persia-fill)",
    stroke: "var(--faction-persia-stroke)",
    text: "var(--faction-persia-text)",
  },
};

const NEUTRAL_STYLE: FactionStyle = {
  fill: "var(--faction-neutral-fill)",
  stroke: "var(--faction-neutral-stroke)",
  text: "var(--faction-neutral-text)",
};

export function factionStyle(owner: string | null): FactionStyle {
  if (owner === null) return NEUTRAL_STYLE;
  return FACTION_STYLES[owner] ?? NEUTRAL_STYLE;
}
