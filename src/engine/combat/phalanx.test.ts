import { describe, it, expect } from "vitest";
import { phalanxDefenseMultiplier, phalanxAdjacencyMultiplier, PHALANX_ABILITY } from "./phalanx";

const PHALANGITE = [PHALANX_ABILITY] as const;

describe("phalanxDefenseMultiplier", () => {
  it("grants the wall bonus to an unflanked phalangite on open ground", () => {
    expect(
      phalanxDefenseMultiplier({
        defenderAbilities: PHALANGITE,
        flanked: false,
        terrainMoveCost: 1,
      }),
    ).toBeCloseTo(1.5);
  });

  it("negates the bonus when the phalangite is flanked", () => {
    expect(
      phalanxDefenseMultiplier({
        defenderAbilities: PHALANGITE,
        flanked: true,
        terrainMoveCost: 1,
      }),
    ).toBeCloseTo(1);
  });

  it("reduces the wall bonus on rough terrain", () => {
    expect(
      phalanxDefenseMultiplier({
        defenderAbilities: PHALANGITE,
        flanked: false,
        terrainMoveCost: 2,
      }),
    ).toBeCloseTo(1.125);
  });

  it("applies the rough-terrain penalty even when flanked", () => {
    expect(
      phalanxDefenseMultiplier({
        defenderAbilities: PHALANGITE,
        flanked: true,
        terrainMoveCost: 2,
      }),
    ).toBeCloseTo(0.75);
  });

  it("is identity for a unit without the phalanx ability", () => {
    expect(
      phalanxDefenseMultiplier({
        defenderAbilities: ["hoplite"],
        flanked: false,
        terrainMoveCost: 1,
      }),
    ).toBe(1);
  });

  it("leaves a non-phalangite unaffected by rough terrain", () => {
    expect(
      phalanxDefenseMultiplier({ defenderAbilities: [], flanked: false, terrainMoveCost: 3 }),
    ).toBe(1);
  });
});

describe("phalanxAdjacencyMultiplier", () => {
  it("is identity for a non-phalangite", () => {
    expect(phalanxAdjacencyMultiplier(["hoplite"], 3)).toBe(1);
  });

  it("is identity for a phalangite with no adjacent phalangites", () => {
    expect(phalanxAdjacencyMultiplier(PHALANGITE, 0)).toBe(1);
  });

  it("adds 10% per adjacent phalangite", () => {
    expect(phalanxAdjacencyMultiplier(PHALANGITE, 2)).toBeCloseTo(1.2);
  });

  it("caps the bonus at 30%", () => {
    expect(phalanxAdjacencyMultiplier(PHALANGITE, 5)).toBeCloseTo(1.3);
  });
});
