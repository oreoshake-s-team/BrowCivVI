import { describe, it, expect } from "vitest";
import type { Unit } from "../unit/types";
import { createMatch, CURRENT_SCHEMA_VERSION, matchFormatOutdated } from "./state";

const UNIT: Unit = {
  id: "u1",
  typeId: "pezhetairos",
  owner: "macedon",
  hex: { q: 0, r: 0 },
  hp: 100,
  morale: 80,
  supplied: true,
  hasMovedThisTurn: false,
};

const BASE = {
  id: "m1",
  seed: 7,
  mapId: "first-slice",
  turnLimit: 20,
  units: [UNIT],
  movementOf: () => 4,
};

describe("matchFormatOutdated", () => {
  it("flags a save stamped below the current schema version", () => {
    expect(matchFormatOutdated(CURRENT_SCHEMA_VERSION - 1)).toBe(true);
  });

  it("does not flag a save at the current schema version", () => {
    expect(matchFormatOutdated(CURRENT_SCHEMA_VERSION)).toBe(false);
  });
});

describe("createMatch", () => {
  it("stamps the current schema version", () => {
    expect(createMatch(BASE).schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("starts at concurrency version 0", () => {
    expect(createMatch(BASE).version).toBe(0);
  });

  it("starts on turn 1", () => {
    expect(createMatch(BASE).turn).toBe(1);
  });

  it("seeds each unit's remaining movement from movementOf", () => {
    expect(createMatch(BASE).movement.u1).toBe(4);
  });

  it("defaults to no owner", () => {
    expect(createMatch(BASE).owner).toBeNull();
  });

  it("records an owner when provided", () => {
    expect(createMatch({ ...BASE, owner: "cookie-abc" }).owner).toBe("cookie-abc");
  });

  it("starts with no city state when no cities are provided", () => {
    expect(createMatch(BASE).cities).toEqual([]);
  });

  it("seeds city state from the provided authored cities", () => {
    const cities = [
      {
        id: "sardis",
        name: "Sardis",
        hex: { q: 0, r: 0 },
        owner: "persia",
        value: 110,
        defense: 24,
      },
    ];
    expect(createMatch({ ...BASE, cities }).cities[0]?.owner).toBe("persia");
  });
});
