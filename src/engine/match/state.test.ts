import { describe, it, expect } from "vitest";
import type { Unit } from "../unit/types";
import { createMatch, CURRENT_SCHEMA_VERSION } from "./state";

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
});
