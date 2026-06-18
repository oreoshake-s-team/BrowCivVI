import { describe, it, expect } from "vitest";
import { SAMPLE_MAP, SAMPLE_UNITS } from "./sample";
import { isImpassable } from "./terrain";
import { mapHexAt, terrainAt } from "./types";

describe("SAMPLE_MAP", () => {
  it("places Dascylium on the map", () => {
    expect(SAMPLE_MAP.cities.get("dascylium")?.owner).toBe("persia");
  });

  it("marks the city hex with its city id", () => {
    expect(mapHexAt(SAMPLE_MAP, { q: 3, r: 1 })?.cityId).toBe("dascylium");
  });

  it("channels movement with an impassable mountain", () => {
    const terrain = terrainAt(SAMPLE_MAP, { q: 1, r: 2 });
    expect(terrain && isImpassable(terrain)).toBe(true);
  });

  it("records the Granicus river edge", () => {
    expect(SAMPLE_MAP.rivers).toHaveLength(1);
  });
});

describe("SAMPLE_UNITS", () => {
  it("stations a Macedon unit on the west bank", () => {
    expect(SAMPLE_UNITS.find((unit) => unit.owner === "macedon")?.hex).toEqual({ q: 1, r: 1 });
  });

  it("stations the Persian cavalry on the east bank", () => {
    expect(SAMPLE_UNITS.find((unit) => unit.owner === "persia")?.hex).toEqual({ q: 2, r: 1 });
  });
});
