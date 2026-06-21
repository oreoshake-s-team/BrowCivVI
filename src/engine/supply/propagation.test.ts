import { describe, it, expect } from "vitest";
import type { City, MapHex } from "../map/types";
import { createGameMap } from "../map/types";
import { createMatch, type MatchState } from "../match/state";
import { riverEdgeSet } from "../movement/cost";
import type { Unit } from "../unit/types";
import { computeSupply, type SupplyContext } from "./propagation";

const ROW: readonly MapHex[] = [0, 1, 2, 3, 4].map((q) => ({
  hex: { q, r: 0 },
  terrain: "plains",
}));
const HOME: City = {
  id: "home",
  name: "Home",
  hex: { q: 0, r: 0 },
  owner: "macedon",
  value: 1,
  defense: 1,
};

function unit(id: string, q: number, owner = "macedon"): Unit {
  return {
    id,
    typeId: "pezhetairos",
    owner,
    hex: { q, r: 0 },
    hp: 100,
    morale: 80,
    supplied: true,
    hasMovedThisTurn: false,
  };
}

function ctxFor(
  rivers: { a: { q: number; r: number }; b: { q: number; r: number } }[] = [],
): SupplyContext {
  const map = createGameMap(ROW, [HOME], rivers);
  return { map, riverEdges: riverEdgeSet(map.rivers) };
}

function stateWith(units: readonly Unit[], scorched: readonly string[] = []): MatchState {
  const base = createMatch({
    id: "m",
    seed: 1,
    mapId: "test",
    turnLimit: 10,
    units,
    movementOf: () => 4,
    cities: [HOME],
  });
  return { ...base, scorched };
}

function suppliedOf(state: MatchState, ctx: SupplyContext, id: string): boolean {
  const computed = computeSupply(state, ctx);
  return computed.units.find((u) => u.id === id)?.supplied === true;
}

describe("computeSupply", () => {
  it("supplies a unit that can trace a land path back to a friendly city", () => {
    expect(suppliedOf(stateWith([unit("u", 2)]), ctxFor(), "u")).toBe(true);
  });

  it("cuts off a unit that has no friendly supply source", () => {
    expect(suppliedOf(stateWith([unit("p", 3, "persia")]), ctxFor(), "p")).toBe(false);
  });

  it("cuts off a unit standing beyond a scorched hex", () => {
    expect(suppliedOf(stateWith([unit("u", 3)], ["2,0"]), ctxFor(), "u")).toBe(false);
  });

  it("keeps a unit supplied on the near side of scorched land", () => {
    expect(suppliedOf(stateWith([unit("u", 1)], ["2,0"]), ctxFor(), "u")).toBe(true);
  });

  it("treats a unit standing on burned land as out of supply", () => {
    expect(suppliedOf(stateWith([unit("u", 1)], ["1,0"]), ctxFor(), "u")).toBe(false);
  });

  it("cuts off a unit on the far bank of a river", () => {
    const ctx = ctxFor([{ a: { q: 2, r: 0 }, b: { q: 3, r: 0 } }]);
    expect(suppliedOf(stateWith([unit("u", 3)]), ctx, "u")).toBe(false);
  });

  it("cuts off a unit screened by enemy-held ground", () => {
    const state = stateWith([unit("u", 3), unit("e", 2, "persia")]);
    expect(suppliedOf(state, ctxFor(), "u")).toBe(false);
  });

  it("returns the same reference when no unit's supply status changes", () => {
    const state = stateWith([unit("u", 2)]);
    expect(computeSupply(state, ctxFor())).toBe(state);
  });
});
