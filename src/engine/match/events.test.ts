import { describe, it, expect } from "vitest";
import type { Unit } from "../unit/types";
import { appendAttack, appendMove, type MatchEvent } from "./events";

const unit = (id: string, typeId: string, owner: string, q: number, r: number): Unit => ({
  id,
  typeId,
  owner,
  hex: { q, r },
  hp: 100,
  morale: 80,
  supplied: true,
  hasMovedThisTurn: false,
});

const ATTACKER = unit("p1", "persian-cavalry", "persia", 4, 1);
const DEFENDER = unit("m1", "pezhetairos", "macedon", 4, 2);

describe("appendMove", () => {
  it("records a move event with the unit, faction, and endpoints", () => {
    const events = appendMove([], 3, ATTACKER, { q: 4, r: 1 }, { q: 4, r: 2 });
    expect(events[0]).toEqual({
      kind: "move",
      seq: 0,
      turn: 3,
      faction: "persia",
      unitId: "p1",
      unitTypeId: "persian-cavalry",
      from: { q: 4, r: 1 },
      to: { q: 4, r: 2 },
    });
  });

  it("assigns the sequence index from the existing log length", () => {
    const seed: readonly MatchEvent[] = appendMove([], 1, ATTACKER, { q: 4, r: 1 }, { q: 4, r: 2 });
    const next = appendMove(seed, 1, ATTACKER, { q: 4, r: 2 }, { q: 4, r: 3 });
    expect(next[1]?.seq).toBe(1);
  });
});

describe("appendAttack", () => {
  it("records an attack event with the target and damage summary", () => {
    const events = appendAttack([], 5, ATTACKER, DEFENDER, {
      attackerDamage: 12,
      defenderDamage: 40,
      defeated: ["m1"],
    });
    expect(events[0]).toEqual({
      kind: "attack",
      seq: 0,
      turn: 5,
      faction: "persia",
      unitId: "p1",
      unitTypeId: "persian-cavalry",
      attackerHex: { q: 4, r: 1 },
      targetId: "m1",
      targetTypeId: "pezhetairos",
      targetHex: { q: 4, r: 2 },
      attackerDamage: 12,
      defenderDamage: 40,
      defeated: ["m1"],
    });
  });
});
