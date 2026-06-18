import type { City, GameMap, MapHex, RiverEdge } from "@/engine/map/types";
import type { TerrainType } from "@/engine/map/terrain";
import type { Citation, Confidence, SourceType } from "@/engine/content/citation";
import type { NamedRegion } from "@/engine/content/region";
import type { Unit } from "@/engine/unit/types";
import { createGameMap } from "@/engine/map/types";

function ref(
  claim: string,
  title: string,
  url: string,
  type: SourceType = "reference",
  confidence: Confidence = "high",
): Citation {
  return { claim, source: { title, url, type }, confidence };
}

function h(q: number, r: number, terrain: TerrainType, cityId?: string): MapHex {
  return cityId === undefined ? { hex: { q, r }, terrain } : { hex: { q, r }, terrain, cityId };
}

const HEXES: readonly MapHex[] = [
  h(0, 0, "hills"), h(1, 0, "plains"), h(2, 0, "plains"), h(3, 0, "plains"),
  h(4, 0, "plains", "sestos"), h(5, 0, "plains", "abydos"), h(6, 0, "coast"),
  h(7, 0, "coast"), h(8, 0, "coast", "cyzicus"), h(9, 0, "deepSea"),
  h(0, 1, "plains", "pella"), h(1, 1, "plains"), h(2, 1, "coast", "amphipolis"),
  h(3, 1, "coast"), h(4, 1, "coast"), h(5, 1, "plains"), h(6, 1, "plains"),
  h(7, 1, "plains", "zeleia"), h(8, 1, "plains", "dascylium"), h(9, 1, "hills"),
  h(0, 2, "hills"), h(1, 2, "plains"), h(2, 2, "coast"), h(3, 2, "coast", "elaeus"),
  h(4, 2, "deepSea"), h(5, 2, "plains", "ilium"), h(6, 2, "plains"), h(7, 2, "hills"),
  h(8, 2, "hills"), h(9, 2, "hills"),
  h(3, 3, "deepSea"), h(4, 3, "deepSea"), h(5, 3, "coast"), h(6, 3, "hills"),
  h(7, 3, "hills"), h(8, 3, "plains"), h(9, 3, "hills"),
  h(5, 4, "coast"), h(6, 4, "mountain"), h(7, 4, "mountain"), h(8, 4, "hills", "sardis"),
  h(9, 4, "hills"),
  h(5, 5, "coast"), h(6, 5, "hills"), h(7, 5, "plains"), h(8, 5, "plains"), h(9, 5, "hills"),
  h(5, 6, "deepSea"), h(6, 6, "coast", "ephesus"), h(7, 6, "plains"), h(8, 6, "hills"),
  h(5, 7, "deepSea"), h(6, 7, "coast"), h(7, 7, "plains"), h(8, 7, "hills"),
  h(6, 8, "coast", "miletus"), h(7, 8, "plains"),
  h(6, 9, "deepSea"), h(7, 9, "coast", "halicarnassus"),
];

const GRANICUS = "https://en.wikipedia.org/wiki/Battle_of_the_Granicus";

const CITIES: readonly City[] = [
  {
    id: "pella", name: "Pella", hex: { q: 0, r: 1 }, owner: "macedon", affinity: "macedon",
    value: 120, defense: 25, firstAttestedBce: 399,
    citation: ref("Pella was the capital of Macedon, Alexander's home base.", "Pella", "https://en.wikipedia.org/wiki/Pella"),
  },
  {
    id: "amphipolis", name: "Amphipolis", hex: { q: 2, r: 1 }, owner: "macedon", affinity: "macedon",
    value: 90, defense: 20, firstAttestedBce: 437,
    citation: ref("Amphipolis on the Strymon was the army's eastward staging point.", "Amphipolis", "https://en.wikipedia.org/wiki/Amphipolis"),
  },
  {
    id: "sestos", name: "Sestos", hex: { q: 4, r: 0 }, owner: "macedon", affinity: "macedon",
    value: 60, defense: 15, firstAttestedBce: 600,
    citation: ref("Sestos on the European shore was the embarkation point for the Hellespont crossing.", "Sestos", "https://en.wikipedia.org/wiki/Sestos"),
  },
  {
    id: "elaeus", name: "Elaeus", hex: { q: 3, r: 2 }, owner: "macedon", affinity: "macedon",
    value: 50, defense: 10, firstAttestedBce: 600,
    citation: ref("From Elaeus at the Chersonese tip Alexander sailed to the Troad.", "Elaeus", "https://en.wikipedia.org/wiki/Elaeus"),
  },
  {
    id: "abydos", name: "Abydos", hex: { q: 5, r: 0 }, owner: "persia", affinity: "macedon",
    value: 70, defense: 18, firstAttestedBce: 670,
    citation: ref("Parmenion ferried the main army across to Abydos on the Asian shore.", "Abydos (Hellespont)", "https://en.wikipedia.org/wiki/Abydos_(Hellespont)"),
  },
  {
    id: "ilium", name: "Ilium", hex: { q: 5, r: 2 }, owner: "persia", affinity: "macedon",
    value: 60, defense: 15, firstAttestedBce: 1700,
    citation: ref("Alexander visited Ilium (Troy) to honour Achilles after crossing.", "Troy", "https://en.wikipedia.org/wiki/Troy"),
  },
  {
    id: "zeleia", name: "Zeleia", hex: { q: 7, r: 1 }, owner: "persia", affinity: "persia",
    value: 50, defense: 18, firstAttestedBce: 1200,
    citation: ref("The Persian satraps mustered and held council at Zeleia before the battle.", "Zeleia", "https://en.wikipedia.org/wiki/Zeleia"),
  },
  {
    id: "dascylium", name: "Dascylium", hex: { q: 8, r: 1 }, owner: "persia", affinity: "persia",
    value: 100, defense: 22, firstAttestedBce: 750,
    citation: ref("Dascylium was the satrapal seat of Hellespontine Phrygia, the road's eastern goal.", "Dascylium", "https://en.wikipedia.org/wiki/Dascylium"),
  },
  {
    id: "cyzicus", name: "Cyzicus", hex: { q: 8, r: 0 }, owner: "persia", affinity: "macedon",
    value: 80, defense: 20, firstAttestedBce: 756,
    citation: ref("Cyzicus was a Greek city on the Propontis coast.", "Cyzicus", "https://en.wikipedia.org/wiki/Cyzicus"),
  },
  {
    id: "sardis", name: "Sardis", hex: { q: 8, r: 4 }, owner: "persia", affinity: "persia",
    value: 110, defense: 24, firstAttestedBce: 1200,
    citation: ref("Sardis, the inland Lydian capital, surrendered to Alexander after the Granicus.", "Sardis", "https://en.wikipedia.org/wiki/Sardis"),
  },
  {
    id: "ephesus", name: "Ephesus", hex: { q: 6, r: 6 }, owner: "persia", affinity: "macedon",
    value: 95, defense: 20, firstAttestedBce: 1000,
    citation: ref("Ephesus was a Greek Ionian city on the Aegean coast south of Sardis.", "Ephesus", "https://en.wikipedia.org/wiki/Ephesus"),
  },
  {
    id: "miletus", name: "Miletus", hex: { q: 6, r: 8 }, owner: "persia", affinity: "macedon",
    value: 90, defense: 20, firstAttestedBce: 1000,
    citation: ref("Miletus, further south on the Ionian coast, was taken by siege.", "Miletus", "https://en.wikipedia.org/wiki/Miletus"),
  },
  {
    id: "halicarnassus", name: "Halicarnassus", hex: { q: 7, r: 9 }, owner: "persia", affinity: "macedon",
    value: 85, defense: 22, firstAttestedBce: 650,
    citation: ref("Halicarnassus in Caria, the southern coastal goal, fell after a hard siege.", "Halicarnassus", "https://en.wikipedia.org/wiki/Halicarnassus"),
  },
];

const RIVERS: readonly RiverEdge[] = [
  { a: { q: 6, r: 1 }, b: { q: 7, r: 1 } },
  { a: { q: 6, r: 2 }, b: { q: 7, r: 2 } },
];

export const FIRST_SLICE_REGIONS: readonly NamedRegion[] = [
  { id: "granicus", name: "Granicus", kind: "river", citation: ref("The Granicus (mod. Biga Çayı) rises on Mount Ida and runs NE to the Propontis; site of the 334 BC battle.", "Battle of the Granicus", GRANICUS, "primary") },
  { id: "aegean", name: "Aegean Sea", kind: "sea", citation: ref("The Aegean separates the Greek mainland from Asia Minor.", "Aegean Sea", "https://en.wikipedia.org/wiki/Aegean_Sea") },
  { id: "propontis", name: "Propontis", kind: "sea", citation: ref("The Propontis (Sea of Marmara) lies north of Hellespontine Phrygia.", "Sea of Marmara", "https://en.wikipedia.org/wiki/Sea_of_Marmara") },
  { id: "hellespont", name: "Hellespont", kind: "strait", citation: ref("The Hellespont strait was crossed Sestos to Abydos.", "Dardanelles", "https://en.wikipedia.org/wiki/Dardanelles") },
  { id: "mount-ida", name: "Mount Ida", kind: "mountain", citation: ref("Mount Ida in the Troad is the source of the Granicus.", "Mount Ida (Turkey)", "https://en.wikipedia.org/wiki/Mount_Ida_(Turkey)") },
  { id: "troad", name: "Troad", kind: "region", citation: ref("The Troad is the NW Anatolian peninsula around Ilium.", "Troad", "https://en.wikipedia.org/wiki/Troad") },
  { id: "lydia", name: "Lydia", kind: "region", citation: ref("Lydia, with its capital Sardis, lay inland to the southeast.", "Lydia", "https://en.wikipedia.org/wiki/Lydia") },
  { id: "ionia", name: "Ionia", kind: "region", citation: ref("Ionia is the central Aegean coast of Asia Minor (Ephesus, Miletus).", "Ionia", "https://en.wikipedia.org/wiki/Ionia") },
];

export const FIRST_SLICE_MAP: GameMap = createGameMap(HEXES, CITIES, RIVERS);

export const FIRST_SLICE_UNITS: readonly Unit[] = [
  { id: "mac-phalanx", typeId: "pezhetairos", owner: "macedon", hex: { q: 5, r: 1 }, facing: 0, hp: 100, morale: 85, supplied: true, hasMovedThisTurn: false },
  { id: "mac-companions", typeId: "hetairoi", owner: "macedon", hex: { q: 6, r: 1 }, facing: 0, hp: 100, morale: 90, supplied: true, hasMovedThisTurn: false },
  { id: "per-cavalry", typeId: "persian-cavalry", owner: "persia", hex: { q: 7, r: 1 }, facing: 3, hp: 100, morale: 70, supplied: true, hasMovedThisTurn: false },
  { id: "per-immortals", typeId: "immortal", owner: "persia", hex: { q: 7, r: 2 }, facing: 3, hp: 100, morale: 75, supplied: true, hasMovedThisTurn: false },
];
