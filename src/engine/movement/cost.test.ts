import { describe, it, expect } from "vitest";
import { createGameMap } from "../map/types";
import { entryCost, riverEdgeSet, RIVER_CROSS_COST } from "./cost";

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
