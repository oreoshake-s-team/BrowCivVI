import { TERRAIN_CATALOG } from "../map/terrain";
import type { City, GameMap } from "../map/types";
import { hexKey } from "../map/types";

export interface ValidationResult {
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export const CAMPAIGN_BCE = 334;
export const RECENT_WINDOW_BCE = 384;

export const REQUIRED_CITY_IDS: readonly string[] = [
  "pella",
  "amphipolis",
  "athens",
  "corinth",
  "sparta",
  "sestos",
  "elaeus",
  "abydos",
  "ilium",
  "zeleia",
  "dascylium",
  "cyzicus",
  "sardis",
  "ephesus",
  "halicarnassus",
  "miletus",
];

function cityOf(map: GameMap, id: string): City | undefined {
  return map.cities.get(id);
}

export function requiredCityErrors(map: GameMap): string[] {
  return REQUIRED_CITY_IDS.filter((id) => !map.cities.has(id)).map(
    (id) => `Missing required city: ${id}`,
  );
}

export function geographyErrors(map: GameMap): string[] {
  const errors: string[] = [];
  const westOf = (wId: string, eId: string, claim: string) => {
    const w = cityOf(map, wId);
    const e = cityOf(map, eId);
    if (w && e && w.hex.q >= e.hex.q) errors.push(`Geography: ${claim}`);
  };
  const southOf = (sId: string, nId: string, claim: string) => {
    const s = cityOf(map, sId);
    const n = cityOf(map, nId);
    if (s && n && s.hex.r <= n.hex.r) errors.push(`Geography: ${claim}`);
  };

  westOf("pella", "sestos", "Pella must lie west of the Hellespont crossing");
  westOf("sestos", "abydos", "the European bank (Sestos) must lie west of the Asian bank (Abydos)");
  westOf("abydos", "dascylium", "the road from Abydos must run east to Dascylium");
  westOf("ephesus", "sardis", "the Ionian coast (Ephesus) must lie west of inland Sardis");
  westOf("athens", "ilium", "the Greek mainland (Athens) must lie west of Asia Minor (Ilium)");
  southOf("sardis", "dascylium", "Sardis must lie inland to the south of the Granicus region");
  southOf("ephesus", "sardis", "Ephesus must lie south of Sardis");
  southOf("miletus", "ephesus", "Miletus must lie south of Ephesus");
  southOf("corinth", "athens", "Corinth must lie south of Athens toward the isthmus");
  southOf("sparta", "corinth", "Sparta must lie deep in the southern Peloponnese, below Corinth");

  const sestos = cityOf(map, "sestos");
  const abydos = cityOf(map, "abydos");
  if (
    sestos &&
    abydos &&
    (Math.abs(sestos.hex.q - abydos.hex.q) > 2 || sestos.hex.r > 1 || abydos.hex.r > 1)
  ) {
    errors.push("Geography: Sestos and Abydos must flank the narrow Hellespont");
  }

  const athens = cityOf(map, "athens");
  const ilium = cityOf(map, "ilium");
  if (athens && ilium) {
    const aegeanHexes = [...map.hexes.values()].filter((mapHex) => {
      const passable = TERRAIN_CATALOG[mapHex.terrain].passableBy;
      const isSea = passable.includes("naval") || passable.length === 0;
      return isSea && mapHex.hex.q > athens.hex.q && mapHex.hex.q < ilium.hex.q;
    });
    if (aegeanHexes.length === 0)
      errors.push("Geography: the Aegean must separate Europe from Asia");
    if (aegeanHexes.length < 6)
      errors.push("Geography: the Aegean must be rendered as a sea body, not a sliver");
  }

  if (map.rivers.length === 0) errors.push("Geography: the Granicus river edge must be present");

  const hasMountain = [...map.hexes.values()].some((mapHex) => mapHex.terrain === "mountain");
  if (!hasMountain)
    errors.push("Geography: Mount Ida must channel the Troad with impassable terrain");

  return errors;
}

export function cityTerrainErrors(map: GameMap): string[] {
  const errors: string[] = [];
  for (const city of map.cities.values()) {
    const mapHex = map.hexes.get(hexKey(city.hex));
    if (mapHex === undefined) {
      errors.push(`City ${city.id} sits off the map`);
    } else if (!TERRAIN_CATALOG[mapHex.terrain].passableBy.includes("land")) {
      errors.push(`City ${city.id} sits on a non-land (${mapHex.terrain}) tile`);
    }
  }
  return errors;
}

export function citationErrors(map: GameMap): string[] {
  return [...map.cities.values()]
    .filter((city) => city.citation === undefined)
    .map((city) => `Citation missing for city: ${city.id}`);
}

export function anachronismErrors(map: GameMap): string[] {
  const errors: string[] = [];
  for (const city of map.cities.values()) {
    if (city.firstAttestedBce === undefined) {
      errors.push(`Anachronism: ${city.id} has no attestation date`);
    } else if (city.firstAttestedBce < CAMPAIGN_BCE) {
      errors.push(`Anachronism: ${city.id} was not yet founded in ${CAMPAIGN_BCE} BC`);
    }
  }
  return errors;
}

export function chronologyWarnings(map: GameMap): string[] {
  const warnings: string[] = [];
  for (const city of map.cities.values()) {
    const bce = city.firstAttestedBce;
    if (bce !== undefined && bce >= CAMPAIGN_BCE && bce < RECENT_WINDOW_BCE) {
      warnings.push(
        `Chronology: ${city.id} was founded within ~50 years of the campaign — verify period fit`,
      );
    }
  }
  return warnings;
}

export function validateFirstSlice(map: GameMap): ValidationResult {
  return {
    errors: [
      ...requiredCityErrors(map),
      ...geographyErrors(map),
      ...cityTerrainErrors(map),
      ...citationErrors(map),
      ...anachronismErrors(map),
    ],
    warnings: chronologyWarnings(map),
  };
}
