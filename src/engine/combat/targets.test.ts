import { describe, it, expect } from "vitest";
import type { Unit } from "../unit/types";
import { attackableHexes } from "./targets";

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

const MACEDON = unit("m1", "pezhetairos", "macedon", 1, 1);

describe("attackableHexes", () => {
  it("lists an adjacent enemy hex as attackable", () => {
    const persia = unit("p1", "persian-cavalry", "persia", 2, 1);
    expect(attackableHexes([MACEDON, persia], "m1")).toContainEqual({ q: 2, r: 1 });
  });

  it("excludes an enemy that is more than one hex away", () => {
    const persia = unit("p1", "persian-cavalry", "persia", 3, 1);
    expect(attackableHexes([MACEDON, persia], "m1")).toHaveLength(0);
  });

  it("never targets a friendly unit", () => {
    const ally = unit("m2", "pezhetairos", "macedon", 2, 1);
    expect(attackableHexes([MACEDON, ally], "m1")).toHaveLength(0);
  });

  it("returns nothing for an unknown attacker id", () => {
    const persia = unit("p1", "persian-cavalry", "persia", 2, 1);
    expect(attackableHexes([MACEDON, persia], "ghost")).toHaveLength(0);
  });
});
