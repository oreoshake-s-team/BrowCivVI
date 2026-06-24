import { describe, it, expect } from "vitest";
import { neighbors } from "@/engine/hex";
import { mapHexAt } from "@/engine/map/types";
import { FIRST_SLICE_MAP, FIRST_SLICE_REGIONS, FIRST_SLICE_UNITS } from "./firstSlice";

describe("FIRST_SLICE_MAP", () => {
  it("holds Macedon's capital at Pella", () => {
    expect(FIRST_SLICE_MAP.cities.get("pella")?.owner).toBe("macedon");
  });

  it("marks Zeleia with Persian affinity", () => {
    expect(FIRST_SLICE_MAP.cities.get("zeleia")?.affinity).toBe("persia");
  });

  it("marks Greek Ephesus with Macedon affinity", () => {
    expect(FIRST_SLICE_MAP.cities.get("ephesus")?.affinity).toBe("macedon");
  });

  it("authors all thirteen named cities", () => {
    expect(FIRST_SLICE_MAP.cities.size).toBe(13);
  });

  it("drops peripheral Cyzicus from the first slice", () => {
    expect(FIRST_SLICE_MAP.cities.has("cyzicus")).toBe(false);
  });

  it("drops minor Elaeus from the first slice", () => {
    expect(FIRST_SLICE_MAP.cities.has("elaeus")).toBe(false);
  });

  it("links pre-Granicus media on Pella", () => {
    expect(FIRST_SLICE_MAP.cities.get("pella")?.media?.length).toBe(3);
  });

  it("fortifies the strongly-walled Lydian capital Sardis", () => {
    expect(FIRST_SLICE_MAP.cities.get("sardis")?.walls).toBe(true);
  });

  it("leaves famously unwalled Sparta without walls", () => {
    expect(FIRST_SLICE_MAP.cities.get("sparta")?.walls).toBeUndefined();
  });

  it("leaves the minor town of Ilium unwalled", () => {
    expect(FIRST_SLICE_MAP.cities.get("ilium")?.walls).toBeUndefined();
  });

  it("walls exactly the ten historically fortified cities", () => {
    expect(
      Array.from(FIRST_SLICE_MAP.cities.values()).filter((c) => c.walls === true),
    ).toHaveLength(10);
  });

  it("models Sparta as an independent holdout (no owner)", () => {
    expect(FIRST_SLICE_MAP.cities.get("sparta")?.owner).toBeNull();
  });

  it("gives independent Sparta a neutral affinity", () => {
    expect(FIRST_SLICE_MAP.cities.get("sparta")?.affinity).toBe("neutral");
  });

  it("secures Abydos as the Macedonian bridgehead at the crossing", () => {
    expect(FIRST_SLICE_MAP.cities.get("abydos")?.owner).toBe("macedon");
  });

  it("leaves Ilium a neutral Troad town rather than a Persian holding", () => {
    expect(FIRST_SLICE_MAP.cities.get("ilium")?.owner).toBeNull();
  });
});

describe("FIRST_SLICE_REGIONS", () => {
  it("includes the Granicus as a cited river feature", () => {
    expect(FIRST_SLICE_REGIONS.find((region) => region.id === "granicus")?.kind).toBe("river");
  });

  it("drops the open-sea labels in favor of the cited land features", () => {
    expect(FIRST_SLICE_REGIONS.find((region) => region.id === "aegean")?.labelHex).toBeUndefined();
  });

  it("anchors the inland Lydia label so its citation is reachable", () => {
    expect(FIRST_SLICE_REGIONS.find((region) => region.id === "lydia")?.labelHex).toEqual({
      q: 9,
      r: 5,
    });
  });

  it("keeps only the tile-sized Aegean islands", () => {
    expect(FIRST_SLICE_REGIONS.filter((region) => region.kind === "island")).toHaveLength(2);
  });
});

describe("Granicus river course", () => {
  it("bridges the two offset segments with a connecting edge", () => {
    expect(FIRST_SLICE_MAP.rivers).toContainEqual({ a: { q: 6, r: 1 }, b: { q: 7, r: 2 } });
  });

  it("runs alongside its Mount Ida mountain source", () => {
    const riverHexes = FIRST_SLICE_MAP.rivers.flatMap((edge) => [edge.a, edge.b]);
    const touchesMountain = riverHexes.some((hex) =>
      neighbors(hex).some((n) => mapHexAt(FIRST_SLICE_MAP, n)?.terrain === "mountain"),
    );
    expect(touchesMountain).toBe(true);
  });

  it("meets the Propontis at a coastal mouth", () => {
    expect(FIRST_SLICE_MAP.rivers).toContainEqual({ a: { q: 6, r: 1 }, b: { q: 7, r: 0 } });
  });

  it("never runs an edge through open water or into a mountain", () => {
    const WATER = new Set(["coast", "deepSea"]);
    const offending = FIRST_SLICE_MAP.rivers.filter((edge) => {
      const a = mapHexAt(FIRST_SLICE_MAP, edge.a)?.terrain;
      const b = mapHexAt(FIRST_SLICE_MAP, edge.b)?.terrain;
      if (a === undefined || b === undefined) return false;
      const bothWater = WATER.has(a) && WATER.has(b);
      const bothMountain = a === "mountain" && b === "mountain";
      return bothWater || bothMountain;
    });
    expect(offending).toEqual([]);
  });
});

function hasRoad(q1: number, r1: number, q2: number, r2: number): boolean {
  return FIRST_SLICE_MAP.roads.some(
    (road) =>
      (road.a.q === q1 && road.a.r === r1 && road.b.q === q2 && road.b.r === r2) ||
      (road.b.q === q1 && road.b.r === r1 && road.a.q === q2 && road.a.r === r2),
  );
}

describe("road network", () => {
  it("authors both royal and plain roads", () => {
    const royal = FIRST_SLICE_MAP.roads.some((road) => road.royal === true);
    const plain = FIRST_SLICE_MAP.roads.some((road) => road.royal !== true);
    expect([royal, plain]).toEqual([true, true]);
  });

  it("anchors the royal road on Zeleia and runs it into Sardis", () => {
    const segment = FIRST_SLICE_MAP.roads.find(
      (road) => road.a.q === 9 && road.a.r === 3 && road.b.q === 9 && road.b.r === 4,
    );
    expect(segment?.royal).toBe(true);
  });

  it("runs a Macedonian road from Pella toward Amphipolis", () => {
    expect(hasRoad(0, 1, 1, 1)).toBe(true);
  });

  it("connects Athens to Corinth across the Isthmus", () => {
    expect(hasRoad(1, 5, 1, 6)).toBe(true);
  });

  it("carries the coast road on to Halicarnassus", () => {
    expect(hasRoad(8, 8, 8, 9)).toBe(true);
  });

  it("leaves the Greek coast roads non-royal", () => {
    const segment = FIRST_SLICE_MAP.roads.find(
      (road) => road.a.q === 1 && road.a.r === 5 && road.b.q === 1 && road.b.r === 6,
    );
    expect(segment?.royal).toBeUndefined();
  });
});

describe("FIRST_SLICE_UNITS", () => {
  it("places Alexander's companions on the approach to the river", () => {
    expect(FIRST_SLICE_UNITS.find((unit) => unit.id === "mac-companions")?.hex).toEqual({
      q: 6,
      r: 1,
    });
  });

  it("fields the Cretan archers for Macedon", () => {
    expect(FIRST_SLICE_UNITS.find((unit) => unit.id === "mac-archers")?.typeId).toBe(
      "cretan-archers",
    );
  });

  it("brings a Macedonian siege train to the campaign", () => {
    expect(FIRST_SLICE_UNITS.find((unit) => unit.id === "mac-siege")?.typeId).toBe("siege-train");
  });

  it("arrays Persian archers behind the satraps' line", () => {
    expect(FIRST_SLICE_UNITS.find((unit) => unit.id === "per-archers")?.typeId).toBe(
      "persian-archers",
    );
  });

  it("stations every unit on land it can occupy", () => {
    const offLand = FIRST_SLICE_UNITS.filter((unit) => {
      const terrain = mapHexAt(FIRST_SLICE_MAP, unit.hex)?.terrain;
      return terrain === undefined || terrain === "coast" || terrain === "deepSea";
    });
    expect(offLand).toEqual([]);
  });
});
