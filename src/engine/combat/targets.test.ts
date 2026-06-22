import { describe, it, expect } from "vitest";
import { createGameMap } from "../map/types";
import type { CityState } from "../match/cities";
import type { Unit } from "../unit/types";
import {
  attackableCityHexes,
  attackableHexes,
  reachableAttacks,
  reachableCityAttacks,
} from "./targets";

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

  it("lets a ranged unit target an enemy two hexes away", () => {
    const archers = unit("a1", "cretan-archers", "macedon", 1, 1);
    const persia = unit("p1", "persian-cavalry", "persia", 3, 1);
    expect(attackableHexes([archers, persia], "a1")).toContainEqual({ q: 3, r: 1 });
  });

  it("does not let a ranged unit target an enemy three hexes away", () => {
    const archers = unit("a1", "cretan-archers", "macedon", 1, 1);
    const persia = unit("p1", "persian-cavalry", "persia", 4, 1);
    expect(attackableHexes([archers, persia], "a1")).toHaveLength(0);
  });
});

const FLAT_MAP = createGameMap(
  [
    { hex: { q: 1, r: 1 }, terrain: "plains" },
    { hex: { q: 2, r: 1 }, terrain: "plains" },
  ],
  [],
);
const NO_RIVERS: ReadonlySet<string> = new Set();

describe("reachableAttacks", () => {
  it("lists an adjacent enemy a unit can still afford to reach", () => {
    const persia = unit("p1", "persian-cavalry", "persia", 2, 1);
    const hexes = reachableAttacks([MACEDON, persia], { m1: 2 }, MACEDON, FLAT_MAP, NO_RIVERS);
    expect(hexes).toContainEqual({ q: 2, r: 1 });
  });

  it("excludes a target the unit can no longer pay to reach", () => {
    const persia = unit("p1", "persian-cavalry", "persia", 2, 1);
    expect(
      reachableAttacks([MACEDON, persia], { m1: 0 }, MACEDON, FLAT_MAP, NO_RIVERS),
    ).toHaveLength(0);
  });

  it("offers no targets once the unit has attacked this turn", () => {
    const persia = unit("p1", "persian-cavalry", "persia", 2, 1);
    const spent = { ...MACEDON, hasAttackedThisTurn: true };
    expect(reachableAttacks([spent, persia], { m1: 2 }, spent, FLAT_MAP, NO_RIVERS)).toHaveLength(
      0,
    );
  });

  it("lets a ranged unit fire at a distant enemy without paying movement to reach it", () => {
    const archers = unit("a1", "cretan-archers", "macedon", 1, 1);
    const persia = unit("p1", "persian-cavalry", "persia", 3, 1);
    expect(
      reachableAttacks([archers, persia], { a1: 1 }, archers, FLAT_MAP, NO_RIVERS),
    ).toContainEqual({ q: 3, r: 1 });
  });

  it("denies a ranged attack once the unit has no movement left", () => {
    const archers = unit("a1", "cretan-archers", "macedon", 1, 1);
    const persia = unit("p1", "persian-cavalry", "persia", 3, 1);
    expect(
      reachableAttacks([archers, persia], { a1: 0 }, archers, FLAT_MAP, NO_RIVERS),
    ).toHaveLength(0);
  });
});

const CITY_MAP = createGameMap(
  [
    { hex: { q: 1, r: 1 }, terrain: "plains" },
    { hex: { q: 2, r: 1 }, terrain: "plains", cityId: "c1" },
    { hex: { q: 3, r: 1 }, terrain: "plains", cityId: "c2" },
  ],
  [],
);
const ENEMY_CITY: CityState = { id: "c1", owner: "persia", hp: 50 };

describe("attackableCityHexes", () => {
  it("lists an adjacent enemy city hex", () => {
    expect(attackableCityHexes(MACEDON, CITY_MAP, [ENEMY_CITY])).toContainEqual({ q: 2, r: 1 });
  });

  it("excludes the attacker's own city", () => {
    expect(
      attackableCityHexes(MACEDON, CITY_MAP, [{ id: "c1", owner: "macedon", hp: 50 }]),
    ).toHaveLength(0);
  });

  it("excludes a fallen city", () => {
    expect(
      attackableCityHexes(MACEDON, CITY_MAP, [{ id: "c1", owner: "persia", hp: 0 }]),
    ).toHaveLength(0);
  });

  it("excludes a city more than one hex away", () => {
    expect(
      attackableCityHexes(MACEDON, CITY_MAP, [{ id: "c2", owner: "persia", hp: 50 }]),
    ).toHaveLength(0);
  });

  it("lets a siege unit bombard a city two hexes away", () => {
    const siege = unit("s1", "siege-train", "macedon", 1, 1);
    expect(
      attackableCityHexes(siege, CITY_MAP, [{ id: "c2", owner: "persia", hp: 50 }]),
    ).toContainEqual({ q: 3, r: 1 });
  });
});

describe("reachableCityAttacks", () => {
  it("includes a reachable adjacent enemy city", () => {
    expect(
      reachableCityAttacks({ m1: 4 }, MACEDON, CITY_MAP, new Set<string>(), [ENEMY_CITY]),
    ).toContainEqual({ q: 2, r: 1 });
  });

  it("excludes a city once the attacker has already attacked", () => {
    const spent = { ...MACEDON, hasAttackedThisTurn: true };
    expect(
      reachableCityAttacks({ m1: 4 }, spent, CITY_MAP, new Set<string>(), [ENEMY_CITY]),
    ).toHaveLength(0);
  });

  it("lets a siege unit bombard a distant city with movement to spare", () => {
    const siege = unit("s1", "siege-train", "macedon", 1, 1);
    expect(
      reachableCityAttacks({ s1: 1 }, siege, CITY_MAP, new Set<string>(), [
        { id: "c2", owner: "persia", hp: 50 },
      ]),
    ).toContainEqual({ q: 3, r: 1 });
  });
});
