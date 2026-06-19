import { describe, it, expect } from "vitest";
import { TERRAIN_CATALOG, blocksLand, isImpassable, isRough, passableBy } from "./terrain";

describe("isImpassable", () => {
  it("flags mountains as impassable", () => {
    expect(isImpassable(TERRAIN_CATALOG.mountain)).toBe(true);
  });

  it("flags deep sea as impassable", () => {
    expect(isImpassable(TERRAIN_CATALOG.deepSea)).toBe(true);
  });

  it("does not flag plains as impassable", () => {
    expect(isImpassable(TERRAIN_CATALOG.plains)).toBe(false);
  });
});

describe("isRough", () => {
  it("flags hills as rough terrain", () => {
    expect(isRough(TERRAIN_CATALOG.hills)).toBe(true);
  });

  it("does not flag plains as rough", () => {
    expect(isRough(TERRAIN_CATALOG.plains)).toBe(false);
  });

  it("does not treat impassable mountains as merely rough", () => {
    expect(isRough(TERRAIN_CATALOG.mountain)).toBe(false);
  });
});

describe("passableBy", () => {
  it("lets land units enter plains", () => {
    expect(passableBy(TERRAIN_CATALOG.plains, "land")).toBe(true);
  });

  it("keeps land units off the coast", () => {
    expect(passableBy(TERRAIN_CATALOG.coast, "land")).toBe(false);
  });

  it("lets naval units use the coast", () => {
    expect(passableBy(TERRAIN_CATALOG.coast, "naval")).toBe(true);
  });
});

describe("blocksLand", () => {
  it("blocks land units from mountains", () => {
    expect(blocksLand("mountain")).toBe(true);
  });

  it("blocks land units from water (coast and deep sea)", () => {
    expect(blocksLand("coast") && blocksLand("deepSea")).toBe(true);
  });

  it("does not block land units from plains", () => {
    expect(blocksLand("plains")).toBe(false);
  });
});
