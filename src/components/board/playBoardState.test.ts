import { describe, it, expect } from "vitest";
import type { BoardView } from "@/app/play/actions";
import type { Unit } from "@/engine/unit/types";
import {
  initialPlayBoardState,
  inputLocked,
  playBoardReducer,
  playerHasActions,
  type PlayBoardState,
} from "./playBoardState";

function unit(id: string, owner: string, q = 0): Unit {
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

const BOARD: BoardView = {
  matchId: "m1",
  units: [unit("mac", "macedon"), unit("per", "persia")],
  movement: { mac: 2, per: 4 },
  playerFaction: "macedon",
  turn: 3,
  activeFaction: "macedon",
};

const READY: PlayBoardState = playBoardReducer(initialPlayBoardState(null), {
  type: "boardLoaded",
  board: BOARD,
});

describe("playBoardReducer", () => {
  it("marks the board ready once loaded", () => {
    expect(READY.ready).toBe(true);
  });

  it("projects the loaded turn number", () => {
    expect(READY.turn).toBe(3);
  });

  it("clears reachable hexes when a new game starts", () => {
    const seeded = { ...READY, reachable: [{ q: 1, r: 1 }] };
    expect(playBoardReducer(seeded, { type: "gameStarted", board: BOARD }).reachable).toEqual([]);
  });

  it("optimistically relocates the moved unit", () => {
    const next = playBoardReducer(READY, {
      type: "moveOptimistic",
      unitId: "mac",
      to: { q: 5, r: 5 },
    });
    expect(next.units.find((u) => u.id === "mac")?.hex).toEqual({ q: 5, r: 5 });
  });

  it("restores the prior units when an action is rejected", () => {
    const moved = playBoardReducer(READY, {
      type: "moveOptimistic",
      unitId: "mac",
      to: { q: 9, r: 9 },
    });
    const rolledBack = playBoardReducer(moved, {
      type: "actionRejected",
      units: READY.units,
      message: "nope",
    });
    expect(rolledBack.units).toBe(READY.units);
  });

  it("surfaces the rejection message as a toast", () => {
    const next = playBoardReducer(READY, {
      type: "actionRejected",
      units: READY.units,
      message: "nope",
    });
    expect(next.toast).toBe("nope");
  });

  it("marks the turn as ending and clears targets", () => {
    const next = playBoardReducer(
      { ...READY, reachable: [{ q: 1, r: 1 }] },
      { type: "endTurnStarted" },
    );
    expect([next.endingTurn, next.reachable.length]).toEqual([true, 0]);
  });

  it("finishes the turn by projecting the new board and clearing the ending flag", () => {
    const next = playBoardReducer(
      { ...READY, endingTurn: true },
      { type: "endTurnFinished", board: { ...BOARD, turn: 4 } },
    );
    expect([next.turn, next.endingTurn]).toEqual([4, false]);
  });

  it("returns to the initial state on reset", () => {
    expect(playBoardReducer(READY, { type: "reset" }).ready).toBe(false);
  });
});

describe("derived selectors", () => {
  it("locks input when it is not the player's turn", () => {
    expect(inputLocked({ ...READY, activeFaction: "persia" })).toBe(true);
  });

  it("locks input while the turn is resolving", () => {
    expect(inputLocked({ ...READY, endingTurn: true })).toBe(true);
  });

  it("reports actions remaining when a player unit still has movement", () => {
    expect(playerHasActions(READY)).toBe(true);
  });

  it("reports no actions when the player's units are spent", () => {
    expect(playerHasActions({ ...READY, movement: { mac: 0, per: 4 } })).toBe(false);
  });
});
