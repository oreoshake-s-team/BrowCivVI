import { describe, it, expect } from "vitest";
import { createGameMap, hexKey, mapHexAt, terrainAt } from "./types";

const MAP = createGameMap(
  [
    { hex: { q: 0, r: 0 }, terrain: "plains" },
    { hex: { q: 1, r: 0 }, terrain: "mountain" },
  ],
  [{ id: "c1", name: "C1", hex: { q: 0, r: 0 }, owner: "macedon", value: 50, defense: 10 }],
);

describe("hexKey", () => {
  it("formats axial coordinates", () => {
    expect(hexKey({ q: 2, r: -3 })).toBe("2,-3");
  });
});

describe("createGameMap", () => {
  it("indexes hexes for lookup", () => {
    expect(mapHexAt(MAP, { q: 1, r: 0 })?.terrain).toBe("mountain");
  });

  it("returns undefined for a hex off the map", () => {
    expect(mapHexAt(MAP, { q: 9, r: 9 })).toBeUndefined();
  });

  it("indexes cities by id", () => {
    expect(MAP.cities.get("c1")?.name).toBe("C1");
  });
});

describe("terrainAt", () => {
  it("resolves the terrain definition at a hex", () => {
    expect(terrainAt(MAP, { q: 1, r: 0 })?.moveCost).toBe(Infinity);
  });

  it("returns undefined off the map", () => {
    expect(terrainAt(MAP, { q: 5, r: 5 })).toBeUndefined();
  });
});
