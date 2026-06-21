import { describe, it, expect } from "vitest";
import { hexDistance, type Hex } from "../hex";
import { createGameMap, type City, type GameMap, type MapHex } from "../map/types";
import type { CityState } from "../match/cities";
import type { MatchState } from "../match/state";
import { riverEdgeSet } from "../movement/cost";
import { createRng } from "../rng";
import { unitTypeById } from "../unit/catalog";
import type { Unit } from "../unit/types";
import { runFactionTurn } from "./greedyTurn";

function plainsMap(width: number, height: number) {
  const hexes: MapHex[] = [];
  for (let r = 0; r < height; r++)
    for (let q = 0; q < width; q++) hexes.push({ hex: { q, r }, terrain: "plains" });
  return createGameMap(hexes, []);
}

const MAP = plainsMap(12, 6);
const NO_RIVERS = riverEdgeSet([]);

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

function match(units: readonly Unit[]): MatchState {
  const movement: Record<string, number> = {};
  for (const u of units) movement[u.id] = unitTypeById(u.typeId)?.movement ?? 0;
  return {
    id: "m",
    schemaVersion: 2,
    version: 0,
    owner: null,
    seed: 1337,
    mapId: "test",
    turn: 1,
    turnLimit: 20,
    turnOrder: ["macedon", "persia"],
    activeFaction: "persia",
    units,
    movement,
    events: [],
    cities: [],
    divergence: {},
  };
}

function run(state: MatchState): MatchState {
  return runFactionTurn({
    state,
    faction: "persia",
    map: MAP,
    riverEdges: NO_RIVERS,
    rng: createRng((state.seed ^ (state.version + 1) ^ state.turn) >>> 0),
  });
}

function cityMap(cityId: string, cityHex: Hex): GameMap {
  const hexes: MapHex[] = [];
  for (let r = 0; r < 6; r++)
    for (let q = 0; q < 12; q++)
      hexes.push(
        q === cityHex.q && r === cityHex.r
          ? { hex: { q, r }, terrain: "plains", cityId }
          : { hex: { q, r }, terrain: "plains" },
      );
  const city: City = {
    id: cityId,
    name: cityId,
    hex: cityHex,
    owner: "macedon",
    value: 100,
    defense: 24,
  };
  return createGameMap(hexes, [city]);
}

function runOn(state: MatchState, map: GameMap): MatchState {
  return runFactionTurn({
    state,
    faction: "persia",
    map,
    riverEdges: NO_RIVERS,
    rng: createRng((state.seed ^ (state.version + 1) ^ state.turn) >>> 0),
  });
}

function withCities(units: readonly Unit[], cities: readonly CityState[]): MatchState {
  return { ...match(units), cities };
}

describe("runFactionTurn city capture", () => {
  const CITY_HEX: Hex = { q: 5, r: 2 };
  const map = cityMap("sardis", CITY_HEX);
  const mover = unit("p1", "persian-cavalry", "persia", 4, 2);

  it("captures a reachable fallen enemy city", () => {
    const after = runOn(withCities([mover], [{ id: "sardis", owner: "macedon", hp: 0 }]), map);
    expect(after.cities.find((c) => c.id === "sardis")?.owner).toBe("persia");
  });

  it("records a capture event for the fallen city", () => {
    const after = runOn(withCities([mover], [{ id: "sardis", owner: "macedon", hp: 0 }]), map);
    const captured = after.events.find((event) => event.kind === "capture");
    expect(captured?.kind === "capture" ? captured.cityId : null).toBe("sardis");
  });

  it("never captures an enemy city that still has HP", () => {
    const after = runOn(withCities([mover], [{ id: "sardis", owner: "macedon", hp: 120 }]), map);
    expect(after.cities.find((c) => c.id === "sardis")?.owner).toBe("macedon");
  });
});

describe("runFactionTurn attacks", () => {
  const WEAK = unit("m-weak", "pezhetairos", "macedon", 3, 1, 90);
  const STRONG = unit("m-strong", "pezhetairos", "macedon", 3, 3, 100);
  const ATTACKER = unit("p1", "persian-cavalry", "persia", 3, 2, 100);
  const after = run(match([WEAK, STRONG, ATTACKER]));

  it("damages the weakest reachable enemy", () => {
    expect(after.units.find((u) => u.id === "m-weak")?.hp).toBeLessThan(90);
  });

  it("leaves the stronger enemy untouched", () => {
    expect(after.units.find((u) => u.id === "m-strong")?.hp).toBe(100);
  });

  it("records an attack event naming the weakest enemy as the target", () => {
    const attack = after.events.find((event) => event.kind === "attack");
    expect(attack?.kind === "attack" ? attack.targetId : null).toBe("m-weak");
  });
});

describe("runFactionTurn movement", () => {
  it("advances toward the nearest enemy when none is in reach", () => {
    const enemy = unit("m1", "pezhetairos", "macedon", 10, 2);
    const mover = unit("p1", "persian-cavalry", "persia", 1, 2);
    const before = hexDistance(mover.hex, enemy.hex);
    const after = run(match([enemy, mover]));
    const moved = after.units.find((u) => u.id === "p1");
    expect(hexDistance(moved?.hex ?? mover.hex, enemy.hex)).toBeLessThan(before);
  });

  it("never relocates a unit belonging to another faction", () => {
    const enemy = unit("m1", "pezhetairos", "macedon", 8, 2);
    const mover = unit("p1", "persian-cavalry", "persia", 1, 2);
    const after = run(match([enemy, mover]));
    expect(after.units.find((u) => u.id === "m1")?.hex).toEqual({ q: 8, r: 2 });
  });

  it("records a move event for the advancing unit", () => {
    const enemy = unit("m1", "pezhetairos", "macedon", 10, 2);
    const mover = unit("p1", "persian-cavalry", "persia", 1, 2);
    const after = run(match([enemy, mover]));
    expect(after.events.find((event) => event.kind === "move")?.unitId).toBe("p1");
  });
});

describe("runFactionTurn determinism", () => {
  it("produces identical state for the same seed and inputs", () => {
    const start = match([
      unit("m1", "pezhetairos", "macedon", 4, 2, 70),
      unit("p1", "persian-cavalry", "persia", 4, 1),
      unit("p2", "persian-cavalry", "persia", 1, 3),
    ]);
    expect(run(start)).toEqual(run(start));
  });

  it("makes no change for a faction that has no units", () => {
    const start = match([unit("m1", "pezhetairos", "macedon", 4, 2)]);
    expect(run(start)).toBe(start);
  });
});
