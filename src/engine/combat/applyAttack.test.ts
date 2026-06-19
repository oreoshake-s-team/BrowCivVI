import { describe, it, expect } from "vitest";
import { createRng } from "../rng";
import type { Unit } from "../unit/types";
import { applyAttack, type ApplyAttackInput } from "./applyAttack";

const unit = (id: string, typeId: string, owner: string, q: number, r: number, hp = 100): Unit => ({
  id,
  typeId,
  owner,
  hex: { q, r },
  hp,
  morale: 80,
  supplied: true,
  hasMovedThisTurn: false,
});

const ATTACKER = unit("m1", "pezhetairos", "macedon", 1, 1);
const DEFENDER = unit("p1", "persian-cavalry", "persia", 2, 1);

function input(over: Partial<ApplyAttackInput> = {}): ApplyAttackInput {
  return {
    units: [ATTACKER, DEFENDER],
    movement: { m1: 2, p1: 2 },
    attackerId: "m1",
    defenderId: "p1",
    defenderTerrainDefense: 0,
    defenderTerrainMoveCost: 1,
    rng: createRng(1),
    ...over,
  };
}

describe("applyAttack", () => {
  it("spends all of the attacker's remaining movement", () => {
    expect(applyAttack(input()).movement.m1).toBe(0);
  });

  it("leaves other units' movement untouched", () => {
    expect(applyAttack(input()).movement.p1).toBe(2);
  });

  it("reduces the defender's hp", () => {
    const defender = applyAttack(input()).units.find((u) => u.id === "p1");
    expect(defender?.hp).toBeLessThan(100);
  });

  it("removes and reports a unit reduced to zero hp", () => {
    const frail = unit("p1", "persian-cavalry", "persia", 2, 1, 1);
    expect(applyAttack(input({ units: [ATTACKER, frail] })).defeated).toContain("p1");
  });

  it("returns the state unchanged when the attacker is missing", () => {
    expect(applyAttack(input({ attackerId: "ghost" })).movement.m1).toBe(2);
  });
});
