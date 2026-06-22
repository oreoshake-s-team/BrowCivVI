import { describe, it, expect } from "vitest";
import { hexDistance, type Hex } from "../hex";
import { createGameMap, hexKey, type City, type GameMap, type MapHex } from "../map/types";
import type { CityState } from "../match/cities";
import { INCITE_PRESSURE } from "../match/incite";
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
    scorched: [],
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

describe("runFactionTurn city siege", () => {
  const CITY_HEX: Hex = { q: 5, r: 2 };
  const map = cityMap("sardis", CITY_HEX);

  it("sieges an adjacent enemy city, reducing its HP", () => {
    const besieger = unit("p1", "persian-cavalry", "persia", 4, 2);
    const after = runOn(withCities([besieger], [{ id: "sardis", owner: "macedon", hp: 120 }]), map);
    expect(after.cities.find((c) => c.id === "sardis")!.hp).toBeLessThan(120);
  });

  it("records a city-attack event for the besieged city", () => {
    const besieger = unit("p1", "persian-cavalry", "persia", 4, 2);
    const after = runOn(withCities([besieger], [{ id: "sardis", owner: "macedon", hp: 120 }]), map);
    expect(after.events.some((event) => event.kind === "cityAttack")).toBe(true);
  });

  it("advances toward an enemy city when none is adjacent", () => {
    const far = unit("p1", "persian-cavalry", "persia", 1, 2);
    const after = runOn(withCities([far], [{ id: "sardis", owner: "macedon", hp: 120 }]), map);
    const moved = after.units.find((u) => u.id === "p1")!;
    expect(hexDistance(moved.hex, CITY_HEX)).toBeLessThan(hexDistance(far.hex, CITY_HEX));
  });

  it("never sieges a friendly city", () => {
    const besieger = unit("p1", "persian-cavalry", "persia", 4, 2);
    const after = runOn(withCities([besieger], [{ id: "sardis", owner: "persia", hp: 120 }]), map);
    expect(after.cities.find((c) => c.id === "sardis")!.hp).toBe(120);
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

function twoCityMap(): GameMap {
  const hexes: MapHex[] = [];
  for (let r = 0; r < 6; r++)
    for (let q = 0; q < 12; q++) {
      const cityId = q === 1 && r === 1 ? "small" : q === 3 && r === 1 ? "big" : undefined;
      hexes.push(
        cityId === undefined
          ? { hex: { q, r }, terrain: "plains" }
          : { hex: { q, r }, terrain: "plains", cityId },
      );
    }
  const cities: City[] = [
    { id: "small", name: "Small", hex: { q: 1, r: 1 }, owner: "persia", value: 50, defense: 10 },
    { id: "big", name: "Big", hex: { q: 3, r: 1 }, owner: "macedon", value: 120, defense: 10 },
  ];
  return createGameMap(hexes, cities);
}

const cityState = (id: string, owner: string, loyalty: number): CityState => ({
  id,
  owner,
  hp: 80,
  loyalty,
});

const loyaltyOf = (state: MatchState, id: string): number =>
  state.cities.find((city) => city.id === id)?.loyalty ?? 0;

describe("runFactionTurn loyalty play", () => {
  it("spends incite on the highest-value eligible city", () => {
    const state = {
      ...match([]),
      cities: [cityState("small", "persia", 0), cityState("big", "macedon", 0)],
    };
    expect(loyaltyOf(runOn(state, twoCityMap()), "big")).toBe(-INCITE_PRESSURE);
  });

  it("skips a city already firmly its own and incites an eligible one", () => {
    const state = {
      ...match([]),
      cities: [cityState("small", "macedon", 0), cityState("big", "persia", -60)],
    };
    const result = runOn(state, twoCityMap());
    expect(loyaltyOf(result, "small")).toBe(-INCITE_PRESSURE);
  });

  it("leaves a firmly held city untouched", () => {
    const state = {
      ...match([]),
      cities: [cityState("small", "macedon", 0), cityState("big", "persia", -60)],
    };
    expect(loyaltyOf(runOn(state, twoCityMap()), "big")).toBe(-60);
  });

  it("does not incite when every city is already firmly its own", () => {
    const state = {
      ...match([]),
      cities: [cityState("small", "persia", -60), cityState("big", "persia", -55)],
    };
    expect(runOn(state, twoCityMap()).incitedThisTurn ?? false).toBe(false);
  });
});

describe("runFactionTurn garrison play", () => {
  const HOME: Hex = { q: 1, r: 1 };

  it("steers a unit toward a wavering own city", () => {
    const map = cityMap("home", HOME);
    const state = {
      ...match([unit("p1", "pezhetairos", "persia", 8, 1)]),
      cities: [cityState("home", "persia", 80)],
    };
    const moved = runOn(state, map).units.find((u) => u.id === "p1");
    expect(moved ? hexDistance(moved.hex, HOME) : 99).toBeLessThan(
      hexDistance({ q: 8, r: 1 }, HOME),
    );
  });

  it("holds position once it is garrisoning the waverer", () => {
    const map = cityMap("home", HOME);
    const state = {
      ...match([unit("p1", "pezhetairos", "persia", 1, 1)]),
      cities: [cityState("home", "persia", 80)],
    };
    const held = runOn(state, map).units.find((u) => u.id === "p1");
    expect(held ? hexKey(held.hex) : "").toBe(hexKey(HOME));
  });

  it("ignores a firmly held own city and advances on the enemy", () => {
    const map = cityMap("home", HOME);
    const state = {
      ...match([
        unit("p1", "pezhetairos", "persia", 8, 1),
        unit("m1", "pezhetairos", "macedon", 4, 1),
      ]),
      cities: [cityState("home", "persia", -60)],
    };
    const moved = runOn(state, map).units.find((u) => u.id === "p1");
    expect(moved ? hexDistance(moved.hex, { q: 4, r: 1 }) : 99).toBeLessThan(
      hexDistance({ q: 8, r: 1 }, { q: 4, r: 1 }),
    );
  });
});

function walledPersiaCityMap(cityHex: Hex): GameMap {
  const hexes: MapHex[] = [];
  for (let r = 0; r < 6; r++)
    for (let q = 0; q < 12; q++)
      hexes.push(
        q === cityHex.q && r === cityHex.r
          ? { hex: { q, r }, terrain: "plains", cityId: "dascylium" }
          : { hex: { q, r }, terrain: "plains" },
      );
  const city: City = {
    id: "dascylium",
    name: "Dascylium",
    hex: cityHex,
    owner: "persia",
    value: 100,
    defense: 22,
    walls: true,
  };
  return createGameMap(hexes, [city]);
}

describe("runFactionTurn walled-city ranged strike", () => {
  const CITY_HEX: Hex = { q: 5, r: 2 };
  const map = walledPersiaCityMap(CITY_HEX);
  const walled: CityState = { id: "dascylium", owner: "persia", hp: 176, wallHp: 100 };
  const adjacentEnemy = unit("m1", "pezhetairos", "macedon", 5, 1, 100);

  it("bombards an adjacent enemy unit from a walled city", () => {
    const after = runOn(withCities([adjacentEnemy], [walled]), map);
    expect(after.units.find((u) => u.id === "m1")!.hp).toBeLessThan(100);
  });

  it("records a city-strike event", () => {
    const after = runOn(withCities([adjacentEnemy], [walled]), map);
    expect(after.events.some((event) => event.kind === "cityStrike")).toBe(true);
  });

  it("spends the city's strike for the turn", () => {
    const after = runOn(withCities([adjacentEnemy], [walled]), map);
    expect(after.cities.find((c) => c.id === "dascylium")!.struckThisTurn).toBe(true);
  });

  it("does not bombard from a breached city", () => {
    const after = runOn(withCities([adjacentEnemy], [{ ...walled, wallHp: 0 }]), map);
    expect(after.events.some((event) => event.kind === "cityStrike")).toBe(false);
  });

  it("does not bombard an enemy that is not adjacent", () => {
    const distant = unit("m2", "pezhetairos", "macedon", 5, 4, 100);
    const after = runOn(withCities([distant], [walled]), map);
    expect(after.events.some((event) => event.kind === "cityStrike")).toBe(false);
  });
});
