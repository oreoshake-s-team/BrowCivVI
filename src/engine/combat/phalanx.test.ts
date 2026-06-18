import { describe, it, expect } from "vitest";
import { phalanxDefenseMultiplier, PHALANX_ABILITY } from "./phalanx";

const PHALANGITE = [PHALANX_ABILITY] as const;

describe("phalanxDefenseMultiplier", () => {
  it("grants the front-arc bonus to a phalangite on open ground", () => {
    expect(
      phalanxDefenseMultiplier({ defenderAbilities: PHALANGITE, arc: "front", terrainMoveCost: 1 }),
    ).toBeCloseTo(1.5);
  });

  it("negates the bonus when struck in the flank", () => {
    expect(
      phalanxDefenseMultiplier({ defenderAbilities: PHALANGITE, arc: "flank", terrainMoveCost: 1 }),
    ).toBeCloseTo(1);
  });

  it("negates the bonus when struck in the rear", () => {
    expect(
      phalanxDefenseMultiplier({ defenderAbilities: PHALANGITE, arc: "rear", terrainMoveCost: 1 }),
    ).toBeCloseTo(1);
  });

  it("reduces the front bonus on rough terrain", () => {
    expect(
      phalanxDefenseMultiplier({ defenderAbilities: PHALANGITE, arc: "front", terrainMoveCost: 2 }),
    ).toBeCloseTo(1.125);
  });

  it("applies the rough-terrain penalty even when flanked", () => {
    expect(
      phalanxDefenseMultiplier({ defenderAbilities: PHALANGITE, arc: "flank", terrainMoveCost: 2 }),
    ).toBeCloseTo(0.75);
  });

  it("is identity for a unit without the phalanx ability", () => {
    expect(
      phalanxDefenseMultiplier({ defenderAbilities: ["hoplite"], arc: "front", terrainMoveCost: 1 }),
    ).toBe(1);
  });

  it("leaves a non-phalangite unaffected by rough terrain", () => {
    expect(
      phalanxDefenseMultiplier({ defenderAbilities: [], arc: "front", terrainMoveCost: 3 }),
    ).toBe(1);
  });
});
