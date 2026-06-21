import { describe, it, expect } from "vitest";
import type { City, MapHex } from "../map/types";
import { createGameMap } from "../map/types";
import type { Unit } from "../unit/types";
import type { CityState } from "./cities";
import { applyLoyaltyPressure, type LoyaltyContext } from "./loyalty";
import type { MatchState } from "./state";

const HEXES: readonly MapHex[] = [0, 1, 2].map((q) => ({ hex: { q, r: 0 }, terrain: "plains" }));

function town(over: Partial<City> = {}): City {
  return {
    id: "town",
    name: "Town",
    hex: { q: 1, r: 0 },
    owner: null,
    value: 1,
    defense: 1,
    ...over,
  };
}

function ctxFor(city: City): LoyaltyContext {
  return {
    map: createGameMap(HEXES, [city]),
    isMilitary: (typeId) => typeId !== "settler",
  };
}

function unit(owner: string, q: number, typeId = "pezhetairos"): Unit {
  return {
    id: `${owner}-${q}`,
    typeId,
    owner,
    hex: { q, r: 0 },
    hp: 100,
    morale: 80,
    supplied: true,
    hasMovedThisTurn: false,
  };
}

function stateWith(cityState: CityState, units: readonly Unit[] = []): MatchState {
  return { units, cities: [cityState] } as unknown as MatchState;
}

function loyaltyAfter(city: City, cityState: CityState, units: readonly Unit[] = []): number {
  const result = applyLoyaltyPressure(stateWith(cityState, units), ctxFor(city));
  return result.cities[0]?.loyalty ?? 0;
}

describe("applyLoyaltyPressure", () => {
  it("drifts a held city toward its owner via momentum", () => {
    expect(
      loyaltyAfter(town({ owner: "macedon" }), { id: "town", owner: "macedon", hp: 8, loyalty: 0 }),
    ).toBe(5);
  });

  it("drifts toward the faction with adjacent military units", () => {
    expect(
      loyaltyAfter(town(), { id: "town", owner: null, hp: 8, loyalty: 0 }, [unit("macedon", 0)]),
    ).toBe(3);
  });

  it("drifts toward the city's authored affinity", () => {
    expect(
      loyaltyAfter(town({ affinity: "macedon" }), { id: "town", owner: null, hp: 8, loyalty: 0 }),
    ).toBe(2);
  });

  it("ignores civilian units when measuring proximity", () => {
    expect(
      loyaltyAfter(town(), { id: "town", owner: null, hp: 8, loyalty: 0 }, [
        unit("macedon", 0, "settler"),
      ]),
    ).toBe(0);
  });

  it("clamps loyalty at the maximum", () => {
    expect(
      loyaltyAfter(town({ owner: "macedon", affinity: "macedon" }), {
        id: "town",
        owner: "macedon",
        hp: 8,
        loyalty: 100,
      }),
    ).toBe(100);
  });

  it("returns the same state reference when nothing drifts", () => {
    const state = stateWith({ id: "town", owner: null, hp: 8, loyalty: 0 });
    expect(applyLoyaltyPressure(state, ctxFor(town()))).toBe(state);
  });
});
