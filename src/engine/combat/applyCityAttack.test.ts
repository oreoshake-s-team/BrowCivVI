import { describe, it, expect } from "vitest";
import type { CityState } from "../match/cities";
import { createRng } from "../rng";
import type { Unit } from "../unit/types";
import { applyCityAttack } from "./applyCityAttack";

const CITY_HEX = { q: 2, r: 1 };

const attacker = (hp = 100): Unit => ({
  id: "m1",
  typeId: "pezhetairos",
  owner: "macedon",
  hex: { q: 1, r: 1 },
  hp,
  morale: 80,
  supplied: true,
  hasMovedThisTurn: false,
});

const onCity = (id: string, owner: string): Unit => ({
  id,
  typeId: "persian-cavalry",
  owner,
  hex: CITY_HEX,
  hp: 100,
  morale: 80,
  supplied: true,
  hasMovedThisTurn: false,
});

function strike(cityHp: number, attackerHp = 100, extraUnits: readonly Unit[] = []) {
  const cities: CityState[] = [{ id: "c1", owner: "persia", hp: cityHp }];
  return applyCityAttack({
    units: [attacker(attackerHp), ...extraUnits],
    cities,
    movement: { m1: 4 },
    attackerId: "m1",
    cityId: "c1",
    cityHex: CITY_HEX,
    cityDefense: 20,
    cityTerrainDefense: 0,
    cityTerrainMoveCost: 1,
    riverAttack: false,
    rng: createRng(7),
  });
}

describe("applyCityAttack", () => {
  it("reduces the target city's HP by the damage dealt", () => {
    const app = strike(200);
    expect(app.cities[0]!.hp).toBe(200 - app.cityDamage);
  });

  it("deals ranged retaliation to the attacker", () => {
    expect(strike(200).attackerDamage).toBeGreaterThan(0);
  });

  it("consumes the attacker's movement", () => {
    expect(strike(200).movement.m1).toBe(0);
  });

  it("marks the city as fallen when its HP reaches 0", () => {
    expect(strike(1).cityFell).toBe(true);
  });

  it("clamps a fallen city's HP at 0", () => {
    expect(strike(1).cities[0]!.hp).toBe(0);
  });

  it("defeats the attacker when retaliation exceeds its HP", () => {
    expect(strike(200, 1).defeated).toContain("m1");
  });

  it("a city's defending strength does not weaken as its HP drops", () => {
    expect(strike(200).attackerDamage).toBe(strike(50).attackerDamage);
  });

  it("a wounded attacker still deals less damage to a city", () => {
    expect(strike(200, 30).cityDamage).toBeLessThan(strike(200, 100).cityDamage);
  });

  it("flags the besieged city as attacked this turn", () => {
    expect(strike(200).cities.find((c) => c.id === "c1")?.attackedThisTurn).toBe(true);
  });

  it("a garrisoned city takes less damage than an ungarrisoned one", () => {
    const garrisoned = strike(200, 100, [onCity("g1", "persia")]).cityDamage;
    expect(garrisoned).toBeLessThan(strike(200).cityDamage);
  });

  it("a garrisoned city deals more retaliation than an ungarrisoned one", () => {
    const garrisoned = strike(200, 100, [onCity("g1", "persia")]).attackerDamage;
    expect(garrisoned).toBeGreaterThan(strike(200).attackerDamage);
  });

  it("only a unit of the city's owner garrisons it", () => {
    const enemyOnCity = strike(200, 100, [onCity("x1", "macedon")]).cityDamage;
    expect(enemyOnCity).toBe(strike(200).cityDamage);
  });
});
