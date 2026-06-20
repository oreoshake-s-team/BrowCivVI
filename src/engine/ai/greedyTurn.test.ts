import { describe, it, expect } from "vitest";
import { hexDistance } from "../hex";
import { createGameMap, type MapHex } from "../map/types";
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
