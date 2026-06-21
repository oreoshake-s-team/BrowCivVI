import { describe, it, expect } from "vitest";
import type { DivergenceView } from "@/app/play/actions";
import type { Unit } from "@/engine/unit/types";
import {
  initialPlayBoardState,
  inputLocked,
  playerHasActions,
  type PlayBoardState,
} from "./playBoardState";

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

const READY: PlayBoardState = {
  ...initialPlayBoardState(null),
  units: [unit("mac", "macedon"), unit("per", "persia")],
  movement: { mac: 2, per: 4 },
  playerFaction: "macedon",
  activeFaction: "macedon",
  turn: 3,
  ready: true,
};

describe("derived selectors", () => {
  it("locks input when it is not the player's turn", () => {
    expect(inputLocked({ ...READY, activeFaction: "persia" })).toBe(true);
  });

  it("locks input while the turn is resolving", () => {
    expect(inputLocked({ ...READY, endingTurn: true })).toBe(true);
  });

  it("allows input on the player's turn", () => {
    expect(inputLocked(READY)).toBe(false);
  });

  it("locks input while the AI attack replay is playing", () => {
    expect(inputLocked({ ...READY, replaying: true })).toBe(true);
  });

  it("locks input while a divergence node is pending", () => {
    const pending = { id: "granicus" } as unknown as DivergenceView;
    expect(inputLocked({ ...READY, pendingDivergence: pending })).toBe(true);
  });

  it("reports actions remaining when a player unit still has movement", () => {
    expect(playerHasActions(READY)).toBe(true);
  });

  it("reports no actions when the player's units are spent", () => {
    expect(playerHasActions({ ...READY, movement: { mac: 0, per: 4 } })).toBe(false);
  });
});
