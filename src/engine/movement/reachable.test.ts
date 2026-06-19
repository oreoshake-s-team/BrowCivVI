import { describe, it, expect } from "vitest";
import { FIRST_SLICE_MAP } from "@/content/firstSlice";
import { createGameMap } from "../map/types";
import { reachableHexes } from "./reachable";

const LAND_MAP = createGameMap(
  [
    { hex: { q: 0, r: 0 }, terrain: "plains" },
    { hex: { q: 1, r: 0 }, terrain: "plains" },
    { hex: { q: 2, r: 0 }, terrain: "hills" },
    { hex: { q: 0, r: 1 }, terrain: "mountain" },
    { hex: { q: 1, r: 1 }, terrain: "coast" },
  ],
  [],
);

const SEA_MAP = createGameMap(
  [
    { hex: { q: 0, r: 0 }, terrain: "coast" },
    { hex: { q: 1, r: 0 }, terrain: "coast" },
  ],
  [],
);

const PASS_MAP = createGameMap(
  [
    { hex: { q: 0, r: 0 }, terrain: "plains" },
    { hex: { q: 1, r: 0 }, terrain: "plains" },
    { hex: { q: 2, r: 0 }, terrain: "plains" },
  ],
  [],
);

const start = { q: 0, r: 0 };

describe("reachableHexes (land)", () => {
  it("reaches an adjacent plains tile", () => {
    const reachable = reachableHexes({ start, movement: 2, map: LAND_MAP, domain: "land" });
    expect(reachable.has("1,0")).toBe(true);
  });

  it("records the remaining movement after entering plains", () => {
    const reachable = reachableHexes({ start, movement: 2, map: LAND_MAP, domain: "land" });
    expect(reachable.get("1,0")).toBe(1);
  });

  it("never reaches an impassable mountain", () => {
    const reachable = reachableHexes({ start, movement: 9, map: LAND_MAP, domain: "land" });
    expect(reachable.has("0,1")).toBe(false);
  });

  it("keeps land units off naval-only coast", () => {
    const reachable = reachableHexes({ start, movement: 9, map: LAND_MAP, domain: "land" });
    expect(reachable.has("1,1")).toBe(false);
  });

  it("cannot afford rough terrain beyond its budget", () => {
    const reachable = reachableHexes({ start, movement: 2, map: LAND_MAP, domain: "land" });
    expect(reachable.has("2,0")).toBe(false);
  });

  it("reaches rough terrain with enough movement", () => {
    const reachable = reachableHexes({ start, movement: 3, map: LAND_MAP, domain: "land" });
    expect(reachable.has("2,0")).toBe(true);
  });

  it("excludes the starting hex", () => {
    const reachable = reachableHexes({ start, movement: 2, map: LAND_MAP, domain: "land" });
    expect(reachable.has("0,0")).toBe(false);
  });

  it("cannot enter a blocked (occupied) hex", () => {
    const reachable = reachableHexes({
      start,
      movement: 2,
      map: LAND_MAP,
      domain: "land",
      blocked: new Set(["1,0"]),
    });
    expect(reachable.has("1,0")).toBe(false);
  });
});

describe("reachableHexes (Granicus map)", () => {
  const companions = { q: 6, r: 1 };

  it("lets the Companions reach the plains immediately south", () => {
    const reachable = reachableHexes({
      start: companions,
      movement: 4,
      map: FIRST_SLICE_MAP,
      domain: "land",
    });
    expect(reachable.has("6,2")).toBe(true);
  });

  it("cannot cross the Aegean to Athens with four movement", () => {
    const reachable = reachableHexes({
      start: companions,
      movement: 4,
      map: FIRST_SLICE_MAP,
      domain: "land",
    });
    expect(reachable.has("2,5")).toBe(false);
  });
});

describe("reachableHexes (occupied tiles)", () => {
  it("moves through a friendly-occupied tile to the hex beyond it", () => {
    const reachable = reachableHexes({
      start,
      movement: 2,
      map: PASS_MAP,
      domain: "land",
      blockedDestinations: new Set(["1,0"]),
    });
    expect(reachable.has("2,0")).toBe(true);
  });

  it("cannot stop on a friendly-occupied tile", () => {
    const reachable = reachableHexes({
      start,
      movement: 2,
      map: PASS_MAP,
      domain: "land",
      blockedDestinations: new Set(["1,0"]),
    });
    expect(reachable.has("1,0")).toBe(false);
  });

  it("cannot move through an enemy-occupied tile", () => {
    const reachable = reachableHexes({
      start,
      movement: 2,
      map: PASS_MAP,
      domain: "land",
      blocked: new Set(["1,0"]),
    });
    expect(reachable.has("2,0")).toBe(false);
  });
});

describe("reachableHexes (naval)", () => {
  it("lets naval units travel along the coast", () => {
    const reachable = reachableHexes({ start, movement: 2, map: SEA_MAP, domain: "naval" });
    expect(reachable.has("1,0")).toBe(true);
  });

  it("keeps land units out of the water", () => {
    const reachable = reachableHexes({ start, movement: 2, map: SEA_MAP, domain: "land" });
    expect(reachable.has("1,0")).toBe(false);
  });
});
