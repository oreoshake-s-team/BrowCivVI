import { describe, it, expect, beforeEach } from "vitest";
import type { BoardView } from "@/app/play/actions";
import type { MatchEvent } from "@/engine/match/events";
import type { Unit } from "@/engine/unit/types";
import { initialPlayBoardState } from "./playBoardState";
import { usePlayBoardStore } from "./playBoardStore";

function unit(id: string, owner: string): Unit {
  return {
    id,
    typeId: "pezhetairos",
    owner,
    hex: { q: 0, r: 0 },
    hp: 100,
    morale: 80,
    supplied: true,
    hasMovedThisTurn: false,
  };
}

const BOARD: BoardView = {
  matchId: "m1",
  units: [unit("mac", "macedon"), unit("per", "persia")],
  movement: { mac: 2, per: 4 },
  playerFaction: "macedon",
  turn: 3,
  activeFaction: "macedon",
  events: [],
};

const MOVE_EVENT: MatchEvent = {
  kind: "move",
  seq: 0,
  turn: 3,
  faction: "macedon",
  unitId: "mac",
  unitTypeId: "pezhetairos",
  from: { q: 0, r: 0 },
  to: { q: 1, r: 0 },
};

const store = () => usePlayBoardStore.getState();

beforeEach(() => {
  usePlayBoardStore.setState(initialPlayBoardState(null));
});

describe("playBoardStore", () => {
  it("marks the board ready once loaded", () => {
    store().boardLoaded(BOARD);
    expect(store().ready).toBe(true);
  });

  it("projects the loaded turn number", () => {
    store().boardLoaded(BOARD);
    expect(store().turn).toBe(3);
  });

  it("projects the loaded event log", () => {
    store().boardLoaded({ ...BOARD, events: [MOVE_EVENT] });
    expect(store().events).toHaveLength(1);
  });

  it("clears reachable hexes when a new game starts", () => {
    store().setTargets([{ q: 1, r: 1 }], []);
    store().gameStarted(BOARD);
    expect(store().reachable).toEqual([]);
  });

  it("optimistically relocates the moved unit", () => {
    store().boardLoaded(BOARD);
    store().moveOptimistic("mac", { q: 5, r: 5 });
    expect(store().units.find((unit) => unit.id === "mac")?.hex).toEqual({ q: 5, r: 5 });
  });

  it("updates the event log when a move reports new events", () => {
    store().boardLoaded(BOARD);
    store().moveApplied(BOARD.units, BOARD.movement, [], [MOVE_EVENT]);
    expect(store().events).toEqual([MOVE_EVENT]);
  });

  it("restores the prior units and toasts when an action is rejected", () => {
    store().boardLoaded(BOARD);
    store().moveOptimistic("mac", { q: 9, r: 9 });
    store().actionRejected(BOARD.units, "nope");
    expect([store().units, store().toast]).toEqual([BOARD.units, "nope"]);
  });

  it("marks the turn as ending and clears targets", () => {
    store().setTargets([{ q: 1, r: 1 }], []);
    store().endTurnStarted();
    expect([store().endingTurn, store().reachable.length]).toEqual([true, 0]);
  });

  it("finishes the turn by projecting the board and clearing the ending flag", () => {
    store().endTurnStarted();
    store().endTurnFinished({ ...BOARD, turn: 4 });
    expect([store().turn, store().endingTurn]).toEqual([4, false]);
  });

  it("returns to the initial state on reset", () => {
    store().boardLoaded(BOARD);
    store().reset();
    expect(store().ready).toBe(false);
  });
});
