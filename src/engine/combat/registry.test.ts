import { describe, it, expect } from "vitest";
import { aggregateDefenseMultiplier } from "./registry";
import { PHALANX_ABILITY } from "./phalanx";

describe("aggregateDefenseMultiplier", () => {
  it("applies the registered phalanx wall bonus when unflanked", () => {
    expect(
      aggregateDefenseMultiplier({ defenderAbilities: [PHALANX_ABILITY], flanked: false, terrainMoveCost: 1 }),
    ).toBeCloseTo(1.5);
  });

  it("combines the flanked penalty with rough terrain", () => {
    expect(
      aggregateDefenseMultiplier({ defenderAbilities: [PHALANX_ABILITY], flanked: true, terrainMoveCost: 2 }),
    ).toBeCloseTo(0.75);
  });

  it("is identity for an unregistered ability", () => {
    expect(
      aggregateDefenseMultiplier({ defenderAbilities: ["heated-sand"], flanked: false, terrainMoveCost: 1 }),
    ).toBe(1);
  });

  it("is identity for a unit with no abilities", () => {
    expect(
      aggregateDefenseMultiplier({ defenderAbilities: [], flanked: true, terrainMoveCost: 1 }),
    ).toBe(1);
  });
});
