import { describe, it, expect } from "vitest";
import type { City, MapHex } from "../map/types";
import { createGameMap } from "../map/types";
import type { Unit } from "../unit/types";
import type { CityState } from "./cities";
import { applyDefections } from "./defection";
import type { LoyaltyContext } from "./loyalty";
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
  return { map: createGameMap(HEXES, [city]), isMilitary: (typeId) => typeId !== "settler" };
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
  return { units, cities: [cityState], events: [], turn: 3 } as unknown as MatchState;
}

function defect(city: City, cityState: CityState, units: readonly Unit[] = []): CityState {
  const result = applyDefections(stateWith(cityState, units), ctxFor(city));
  return result.cities[0]!;
}

describe("applyDefections", () => {
  it("flips a city that has held past the threshold for a full turn", () => {
    expect(
      defect(town({ owner: "persia" }), {
        id: "town",
        owner: "persia",
        hp: 8,
        loyalty: 60,
        defecting: true,
      }).owner,
    ).toBe("macedon");
  });

  it("marks a freshly qualifying city as pending without flipping it", () => {
    const result = defect(town({ owner: "persia" }), {
      id: "town",
      owner: "persia",
      hp: 8,
      loyalty: 60,
    });
    expect(result.owner).toBe("persia");
  });

  it("starts the pending flag on a freshly qualifying city", () => {
    expect(
      defect(town({ owner: "persia" }), { id: "town", owner: "persia", hp: 8, loyalty: 60 })
        .defecting,
    ).toBe(true);
  });

  it("freezes defection while an enemy combat unit garrisons the city", () => {
    const held = defect(
      town({ owner: "persia" }),
      { id: "town", owner: "persia", hp: 8, loyalty: 60, defecting: true },
      [unit("persia", 1)],
    );
    expect(held.owner).toBe("persia");
  });

  it("still flips when only the defection target's own army is adjacent", () => {
    const flipped = defect(
      town({ owner: "persia" }),
      { id: "town", owner: "persia", hp: 8, loyalty: 60, defecting: true },
      [unit("macedon", 0)],
    );
    expect(flipped.owner).toBe("macedon");
  });

  it("ignores civilians when judging the under-threat freeze", () => {
    const flipped = defect(
      town({ owner: "persia" }),
      { id: "town", owner: "persia", hp: 8, loyalty: 60, defecting: true },
      [unit("persia", 1, "settler")],
    );
    expect(flipped.owner).toBe("macedon");
  });

  it("clears a stale pending flag once loyalty falls back below the threshold", () => {
    expect(
      defect(town({ owner: "persia" }), {
        id: "town",
        owner: "persia",
        hp: 8,
        loyalty: 30,
        defecting: true,
      }).defecting,
    ).toBe(false);
  });

  it("does not defect a city loyal to its own owner", () => {
    const result = defect(town({ owner: "macedon" }), {
      id: "town",
      owner: "macedon",
      hp: 8,
      loyalty: 60,
    });
    expect(result.defecting ?? false).toBe(false);
  });

  it("restores full value by clearing the sacked flag on defection", () => {
    expect(
      defect(town({ owner: "persia" }), {
        id: "town",
        owner: "persia",
        hp: 8,
        loyalty: 60,
        defecting: true,
        sacked: true,
      }).sacked,
    ).toBe(false);
  });

  it("reseeds a flipped city to a teetering loyalty rather than a deep value", () => {
    expect(
      defect(town({ owner: "persia" }), {
        id: "town",
        owner: "persia",
        hp: 8,
        loyalty: 60,
        defecting: true,
      }).loyalty,
    ).toBe(0);
  });

  it("resets the drift streak when a city flips so it stays volatile", () => {
    expect(
      defect(town({ owner: "persia" }), {
        id: "town",
        owner: "persia",
        hp: 8,
        loyalty: 60,
        loyaltyStreak: 5,
        defecting: true,
      }).loyaltyStreak,
    ).toBe(0);
  });

  it("leaves loyalty untouched on a city that only becomes pending", () => {
    expect(
      defect(town({ owner: "persia" }), { id: "town", owner: "persia", hp: 8, loyalty: 60 })
        .loyalty,
    ).toBe(60);
  });

  it("returns the same state reference when no city changes", () => {
    const state = stateWith({ id: "town", owner: "persia", hp: 8, loyalty: -60 });
    expect(applyDefections(state, ctxFor(town({ owner: "persia" })))).toBe(state);
  });

  it("emits a defection event recording the new owner when a city flips", () => {
    const state = stateWith({
      id: "town",
      owner: "persia",
      hp: 8,
      loyalty: 60,
      defecting: true,
    });
    const result = applyDefections(state, ctxFor(town({ owner: "persia" })));
    expect(result.events.at(-1)).toMatchObject({
      kind: "defection",
      cityId: "town",
      faction: "macedon",
      previousOwner: "persia",
    });
  });

  it("does not emit an event when a city only becomes pending", () => {
    const state = stateWith({ id: "town", owner: "persia", hp: 8, loyalty: 60 });
    expect(applyDefections(state, ctxFor(town({ owner: "persia" }))).events).toHaveLength(0);
  });
});
