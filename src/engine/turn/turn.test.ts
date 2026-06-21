import { describe, it, expect } from "vitest";
import type { City, MapHex } from "../map/types";
import { createGameMap } from "../map/types";
import { createMatch, type MatchState } from "../match/state";
import { riverEdgeSet } from "../movement/cost";
import type { Unit } from "../unit/types";
import { advanceTurn, type TurnContext } from "./turn";

const ctx: TurnContext = { movementOf: () => 4, cityMaxHp: () => 100 };

function unit(id: string, owner: string, hasMovedThisTurn = false): Unit {
  return {
    id,
    typeId: "pezhetairos",
    owner,
    hex: { q: 0, r: 0 },
    hp: 100,
    morale: 80,
    supplied: true,
    hasMovedThisTurn,
  };
}

function match(over: Partial<MatchState> = {}): MatchState {
  const base = createMatch({
    id: "m1",
    seed: 1,
    mapId: "first-slice",
    turnLimit: 20,
    units: [unit("mac", "macedon", true), unit("per", "persia", true)],
    movementOf: () => 0,
  });
  return { ...base, movement: { mac: 0, per: 0 }, ...over };
}

describe("advanceTurn", () => {
  it("hands control to the next faction in order", () => {
    expect(advanceTurn(match(), ctx).activeFaction).toBe("persia");
  });

  it("keeps the round number while moving within a round", () => {
    expect(advanceTurn(match(), ctx).turn).toBe(1);
  });

  it("increments the round when the order wraps back to the first faction", () => {
    expect(advanceTurn(match({ activeFaction: "persia" }), ctx).turn).toBe(2);
  });

  it("restores the incoming faction's movement", () => {
    expect(advanceTurn(match({ activeFaction: "persia" }), ctx).movement.mac).toBe(4);
  });

  it("clears the incoming faction's hasMovedThisTurn flag", () => {
    const macedon = advanceTurn(match({ activeFaction: "persia" }), ctx).units.find(
      (u) => u.id === "mac",
    );
    expect(macedon?.hasMovedThisTurn).toBe(false);
  });

  it("leaves the off-turn faction's movement untouched", () => {
    expect(advanceTurn(match({ activeFaction: "persia" }), ctx).movement.per).toBe(0);
  });

  it("clears the incoming faction's hasAttackedThisTurn flag", () => {
    const m = match({
      activeFaction: "persia",
      units: [{ ...unit("mac", "macedon"), hasAttackedThisTurn: true }, unit("per", "persia")],
    });
    const macedon = advanceTurn(m, ctx).units.find((u) => u.id === "mac");
    expect(macedon?.hasAttackedThisTurn).toBe(false);
  });
});

describe("advanceTurn city healing", () => {
  function withCity(over: Partial<{ hp: number; attackedThisTurn: boolean }>): MatchState {
    return match({
      activeFaction: "persia",
      cities: [{ id: "sardis", owner: "macedon", hp: 50, ...over }],
    });
  }

  it("heals an un-attacked city of the incoming faction toward max", () => {
    expect(advanceTurn(withCity({}), ctx).cities[0]?.hp).toBe(70);
  });

  it("does not heal a city attacked during the round", () => {
    expect(advanceTurn(withCity({ attackedThisTurn: true }), ctx).cities[0]?.hp).toBe(50);
  });

  it("never heals beyond the city's max HP", () => {
    expect(advanceTurn(withCity({ hp: 95 }), ctx).cities[0]?.hp).toBe(100);
  });

  it("clears the attacked-this-turn flag after the heal pass", () => {
    expect(advanceTurn(withCity({ attackedThisTurn: true }), ctx).cities[0]?.attackedThisTurn).toBe(
      false,
    );
  });

  it("leaves an off-turn faction's city untouched", () => {
    const m = match({
      activeFaction: "macedon",
      cities: [{ id: "sardis", owner: "macedon", hp: 50 }],
    });
    expect(advanceTurn(m, ctx).cities[0]?.hp).toBe(50);
  });
});

const SUPPLY_ROW: readonly MapHex[] = [0, 1, 2, 3].map((q) => ({
  hex: { q, r: 0 },
  terrain: "plains",
}));
const SUPPLY_HOME: City = {
  id: "home",
  name: "Home",
  hex: { q: 0, r: 0 },
  owner: "macedon",
  value: 1,
  defense: 1,
};
const supplyMap = createGameMap(SUPPLY_ROW, [SUPPLY_HOME]);
const supplyCtx: TurnContext = {
  movementOf: () => 4,
  cityMaxHp: () => 100,
  supply: { map: supplyMap, riverEdges: riverEdgeSet(supplyMap.rivers) },
};

function cutOffMatch(): MatchState {
  const macedon: Unit = {
    id: "mac",
    typeId: "pezhetairos",
    owner: "macedon",
    hex: { q: 2, r: 0 },
    hp: 100,
    morale: 80,
    supplied: true,
    hasMovedThisTurn: false,
  };
  const base = createMatch({
    id: "m1",
    seed: 1,
    mapId: "supply",
    turnLimit: 20,
    units: [macedon, unit("per", "persia")],
    movementOf: () => 4,
    cities: [SUPPLY_HOME],
  });
  return { ...base, activeFaction: "persia", scorched: ["1,0"] };
}

describe("advanceTurn supply phase", () => {
  it("marks a cut-off unit out of supply at the start of its turn", () => {
    const macedon = advanceTurn(cutOffMatch(), supplyCtx).units.find((u) => u.id === "mac");
    expect(macedon?.supplied).toBe(false);
  });

  it("attrits the freshly cut-off unit, proving supply runs before attrition", () => {
    const macedon = advanceTurn(cutOffMatch(), supplyCtx).units.find((u) => u.id === "mac");
    expect(macedon?.hp).toBe(90);
  });
});

describe("advanceTurn loyalty phase", () => {
  const loyaltyCtx: TurnContext = {
    movementOf: () => 4,
    cityMaxHp: () => 100,
    loyalty: { map: supplyMap, isMilitary: () => true },
  };

  it("drifts a city's loyalty via the pressure pass", () => {
    const away: Unit = {
      id: "per",
      typeId: "pezhetairos",
      owner: "persia",
      hex: { q: 3, r: 0 },
      hp: 100,
      morale: 80,
      supplied: true,
      hasMovedThisTurn: false,
    };
    const base = createMatch({
      id: "loy",
      seed: 1,
      mapId: "supply",
      turnLimit: 20,
      units: [away],
      movementOf: () => 4,
      cities: [SUPPLY_HOME],
    });
    const m: MatchState = { ...base, activeFaction: "persia" };
    expect(advanceTurn(m, loyaltyCtx).cities[0]?.loyalty).toBe(55);
  });
});
