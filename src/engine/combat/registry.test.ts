import { describe, it, expect } from "vitest";
import { aggregateDefenseMultiplier } from "./registry";
import { PHALANX_ABILITY } from "./phalanx";

describe("aggregateDefenseMultiplier", () => {
  it("applies the registered phalanx modifier for a front attack", () => {
    expect(
      aggregateDefenseMultiplier({
        defenderAbilities: [PHALANX_ABILITY],
        arc: "front",
        terrainMoveCost: 1,
      }),
    ).toBeCloseTo(1.5);
  });

  it("combines the phalanx flank and rough-terrain effects", () => {
    expect(
      aggregateDefenseMultiplier({
        defenderAbilities: [PHALANX_ABILITY],
        arc: "flank",
        terrainMoveCost: 2,
      }),
    ).toBeCloseTo(0.75);
  });

  it("is identity for an unregistered ability", () => {
    expect(
      aggregateDefenseMultiplier({
        defenderAbilities: ["heated-sand"],
        arc: "front",
        terrainMoveCost: 1,
      }),
    ).toBe(1);
  });

  it("is identity for a unit with no abilities", () => {
    expect(
      aggregateDefenseMultiplier({ defenderAbilities: [], arc: "rear", terrainMoveCost: 1 }),
    ).toBe(1);
  });
});
