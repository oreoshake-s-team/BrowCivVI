import { describe, it, expect } from "vitest";
import { neighbors } from "@/engine/hex";
import { mapHexAt } from "@/engine/map/types";
import { FIRST_SLICE_MAP, FIRST_SLICE_REGIONS, FIRST_SLICE_UNITS } from "./firstSlice";

describe("FIRST_SLICE_MAP", () => {
  it("holds Macedon's capital at Pella", () => {
    expect(FIRST_SLICE_MAP.cities.get("pella")?.owner).toBe("macedon");
  });

  it("marks Dascylium with Persian affinity", () => {
    expect(FIRST_SLICE_MAP.cities.get("dascylium")?.affinity).toBe("persia");
  });

  it("marks Greek Ephesus with Macedon affinity", () => {
    expect(FIRST_SLICE_MAP.cities.get("ephesus")?.affinity).toBe("macedon");
  });

  it("authors all fourteen named cities", () => {
    expect(FIRST_SLICE_MAP.cities.size).toBe(14);
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
      q: 8,
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
