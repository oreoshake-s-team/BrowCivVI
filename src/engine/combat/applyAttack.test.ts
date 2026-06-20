import { describe, it, expect, vi } from "vitest";
import { createRng } from "../rng";
import type { Unit } from "../unit/types";
import { applyAttack, type ApplyAttackInput } from "./applyAttack";

vi.mock("../unit/catalog", async (importActual) => {
  const actual = await importActual<typeof import("../unit/catalog")>();
  const hitRunner = {
    ...actual.unitTypeById("persian-cavalry")!,
    id: "horse-archer",
    hitAndRun: true,
  };
  return {
    ...actual,
    unitTypeById: (id: string) => (id === "horse-archer" ? hitRunner : actual.unitTypeById(id)),
  };
});

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
    riverAttack: false,
    rng: createRng(1),
    ...over,
  };
}

describe("applyAttack", () => {
  it("spends all of the attacker's remaining movement", () => {
    expect(applyAttack(input()).movement.m1).toBe(0);
  });

  it("a hit-and-run attacker keeps its remaining movement", () => {
    const attacker = unit("m1", "horse-archer", "macedon", 1, 1);
    expect(applyAttack(input({ units: [attacker, DEFENDER] })).movement.m1).toBe(2);
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

  it("deals less damage when the attack crosses a river", () => {
    const open = applyAttack(input({ riverAttack: false })).defenderDamage;
    const river = applyAttack(input({ riverAttack: true })).defenderDamage;
    expect(river < open).toBe(true);
  });
});
