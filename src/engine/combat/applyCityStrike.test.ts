import { describe, it, expect } from "vitest";
import type { CityState } from "../match/cities";
import { createRng } from "../rng";
import type { Unit } from "../unit/types";
import { applyCityStrike, cityStrikeTargets } from "./applyCityStrike";

const CITY_HEX = { q: 2, r: 1 };
const WALLED: CityState = { id: "c1", owner: "persia", hp: 160, wallHp: 100 };

const enemy = (id: string, q: number, r: number, hp = 100): Unit => ({
  id,
  typeId: "pezhetairos",
  owner: "macedon",
  hex: { q, r },
  hp,
  morale: 80,
  supplied: true,
  hasMovedThisTurn: false,
});

function strike(city: CityState, target: Unit, others: readonly Unit[] = []) {
  return applyCityStrike({
    units: [target, ...others],
    cities: [city],
    cityId: "c1",
    cityHex: CITY_HEX,
    cityStrength: 22,
    targetId: target.id,
    targetTerrainDefense: 0,
    targetTerrainMoveCost: 1,
    rng: createRng(7),
  });
}

describe("cityStrikeTargets", () => {
  it("lists an adjacent enemy unit for a walled standing city", () => {
    expect(cityStrikeTargets(WALLED, CITY_HEX, [enemy("m1", 2, 2)])).toHaveLength(1);
  });

  it("excludes a friendly unit on an adjacent hex", () => {
    const friendly: Unit = { ...enemy("p1", 2, 2), owner: "persia" };
    expect(cityStrikeTargets(WALLED, CITY_HEX, [friendly])).toHaveLength(0);
  });

  it("excludes a non-adjacent enemy unit", () => {
    expect(cityStrikeTargets(WALLED, CITY_HEX, [enemy("m1", 2, 3)])).toHaveLength(0);
  });

  it("offers no targets once the walls are breached", () => {
    expect(cityStrikeTargets({ ...WALLED, wallHp: 0 }, CITY_HEX, [enemy("m1", 2, 2)])).toHaveLength(
      0,
    );
  });

  it("offers no targets for an unwalled city", () => {
    expect(
      cityStrikeTargets({ id: "c1", owner: "persia", hp: 160 }, CITY_HEX, [enemy("m1", 2, 2)]),
    ).toHaveLength(0);
  });

  it("offers no targets once the city has already struck this turn", () => {
    expect(
      cityStrikeTargets({ ...WALLED, struckThisTurn: true }, CITY_HEX, [enemy("m1", 2, 2)]),
    ).toHaveLength(0);
  });
});

describe("applyCityStrike", () => {
  it("damages the targeted enemy unit", () => {
    expect(strike(WALLED, enemy("m1", 2, 2)).damage).toBeGreaterThan(0);
  });

  it("marks the city as having struck this turn", () => {
    expect(strike(WALLED, enemy("m1", 2, 2)).cities[0]!.struckThisTurn).toBe(true);
  });

  it("defeats and removes a target it reduces to zero HP", () => {
    expect(strike(WALLED, enemy("m1", 2, 2, 1)).defeated).toBe(true);
  });

  it("leaves no surviving token for a defeated target", () => {
    expect(strike(WALLED, enemy("m1", 2, 2, 1)).units.some((u) => u.id === "m1")).toBe(false);
  });

  it("does no damage from a breached city", () => {
    expect(strike({ ...WALLED, wallHp: 0 }, enemy("m1", 2, 2)).damage).toBe(0);
  });

  it("does no damage to a non-adjacent unit", () => {
    expect(strike(WALLED, enemy("m1", 2, 3)).damage).toBe(0);
  });
});
