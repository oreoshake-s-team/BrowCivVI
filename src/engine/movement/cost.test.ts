import { describe, it, expect } from "vitest";
import { TERRAIN_CATALOG } from "../map/terrain";
import { createGameMap } from "../map/types";
import { entryCost, riverEdgeSet, roadEdgeSets, roadStepCost, RIVER_CROSS_COST } from "./cost";

const MAP = createGameMap(
  [
    { hex: { q: 0, r: 0 }, terrain: "plains" },
    { hex: { q: 1, r: 0 }, terrain: "plains" },
  ],
  [],
);

const rivers = riverEdgeSet([{ a: { q: 0, r: 0 }, b: { q: 1, r: 0 } }]);

describe("entryCost", () => {
  it("charges only terrain cost when no river separates the tiles", () => {
    expect(entryCost(MAP, new Set(), { q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1);
  });

  it("adds the river crossing cost across a river edge", () => {
    expect(entryCost(MAP, rivers, { q: 0, r: 0 }, { q: 1, r: 0 })).toBe(1 + RIVER_CROSS_COST);
  });

  it("treats the edge as undirected", () => {
    expect(entryCost(MAP, rivers, { q: 1, r: 0 }, { q: 0, r: 0 })).toBe(1 + RIVER_CROSS_COST);
  });

  it("returns null for an off-map destination", () => {
    expect(entryCost(MAP, rivers, { q: 0, r: 0 }, { q: 9, r: 9 })).toBeNull();
  });
});

describe("roadStepCost", () => {
  it("waives the hill movement penalty", () => {
    expect(roadStepCost(TERRAIN_CATALOG.hills, false)).toBe(1);
  });

  it("waives the forest movement penalty", () => {
    expect(roadStepCost(TERRAIN_CATALOG.forest, false)).toBe(1);
  });

  it("does not waive the marsh penalty", () => {
    expect(roadStepCost(TERRAIN_CATALOG.marsh, false)).toBe(2);
  });

  it("halves the cost on a royal road", () => {
    expect(roadStepCost(TERRAIN_CATALOG.hills, true)).toBe(0.5);
  });
});

describe("roadEdgeSets", () => {
  it("indexes a plain road edge without marking it royal", () => {
    const sets = roadEdgeSets([{ a: { q: 0, r: 0 }, b: { q: 1, r: 0 } }]);
    expect([sets.road.has("0,0|1,0"), sets.royal.has("0,0|1,0")]).toEqual([true, false]);
  });

  it("marks a royal road edge in both sets", () => {
    const sets = roadEdgeSets([{ a: { q: 0, r: 0 }, b: { q: 1, r: 0 }, royal: true }]);
    expect(sets.royal.has("0,0|1,0")).toBe(true);
  });
});
