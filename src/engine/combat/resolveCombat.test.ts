import { describe, it, expect } from "vitest";
import { createRng, type Rng } from "../rng";
import { resolveCombat, type CombatInput, type CombatSide } from "./resolveCombat";

const side = (strength: number, hp: number): CombatSide => ({ strength, hp });

function makeInput(rng: Rng, over: Partial<CombatInput> = {}): CombatInput {
  return {
    attacker: side(40, 100),
    defender: side(30, 100),
    defenderAbilities: [],
    defenderTerrainDefense: 0,
    defenderTerrainMoveCost: 1,
    flanked: false,
    rng,
    ...over,
  };
}

describe("resolveCombat", () => {
  it("is deterministic for a given seed", () => {
    expect(resolveCombat(makeInput(createRng(1)))).toEqual(resolveCombat(makeInput(createRng(1))));
  });

  it("hits a weaker defender harder than it is hit back", () => {
    const result = resolveCombat(
      makeInput(createRng(2), { attacker: side(45, 100), defender: side(20, 100) }),
    );
    expect(result.defenderDamage > result.attackerDamage).toBe(true);
  });

  it("always deals at least one damage", () => {
    const result = resolveCombat(
      makeInput(createRng(3), { attacker: side(5, 100), defender: side(60, 100) }),
    );
    expect(result.defenderDamage).toBeGreaterThanOrEqual(1);
  });

  it("never deals more than the defender's remaining HP", () => {
    const result = resolveCombat(makeInput(createRng(4), { defender: side(30, 5) }));
    expect(result.defenderDamage).toBeLessThanOrEqual(5);
  });

  it("defeats a defender on its last hit point", () => {
    const result = resolveCombat(makeInput(createRng(5), { defender: side(30, 1) }));
    expect(result.defenderDefeated).toBe(true);
  });

  it("a flanked phalangite takes more damage than an unflanked one", () => {
    const unflanked = resolveCombat(
      makeInput(createRng(6), { defenderAbilities: ["phalanx"], flanked: false }),
    );
    const flanked = resolveCombat(
      makeInput(createRng(6), { defenderAbilities: ["phalanx"], flanked: true }),
    );
    expect(flanked.defenderDamage > unflanked.defenderDamage).toBe(true);
  });

  it("rough terrain weakens the phalanx wall", () => {
    const open = resolveCombat(
      makeInput(createRng(7), { defenderAbilities: ["phalanx"], defenderTerrainMoveCost: 1 }),
    );
    const rough = resolveCombat(
      makeInput(createRng(7), { defenderAbilities: ["phalanx"], defenderTerrainMoveCost: 2 }),
    );
    expect(rough.defenderDamage > open.defenderDamage).toBe(true);
  });

  it("terrain defense reduces damage to the defender", () => {
    const flat = resolveCombat(makeInput(createRng(8), { defenderTerrainDefense: 0 }));
    const defended = resolveCombat(makeInput(createRng(8), { defenderTerrainDefense: 0.5 }));
    expect(defended.defenderDamage < flat.defenderDamage).toBe(true);
  });
});
