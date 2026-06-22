import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FIRST_SLICE_UNITS } from "@/content/firstSlice";
import type { Hex } from "@/engine/hex";
import { hexKey } from "@/engine/map/types";
import { INCITE_PRESSURE } from "@/engine/match/incite";
import {
  loadBoard,
  newGame,
  move,
  attack,
  attackCity,
  incite,
  targetsFor,
  endTurn,
  resolveDivergence,
  type BoardView,
} from "./actions";

const { getAuth0Mock, intentAllowedMock } = vi.hoisted(() => ({
  getAuth0Mock: vi.fn(),
  intentAllowedMock: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("@/lib/auth0", () => ({
  isAuthConfigured: () => true,
  getAuth0: getAuth0Mock,
}));

vi.mock("@/server/rateLimit", () => ({ intentAllowed: intentAllowedMock }));

function signIn(sub: string | null): void {
  getAuth0Mock.mockReturnValue({
    getSession: () => Promise.resolve(sub === null ? null : { user: { sub } }),
  });
}

const PHALANX = "mac-phalanx";
const COMPANIONS = "mac-companions";
const PER_CAVALRY = "per-cavalry";
const PER_IMMORTALS = "per-immortals";
const PHALANX_START: Hex = { q: 5, r: 1 };
const COMPANIONS_START: Hex = { q: 6, r: 1 };
const ILIUM: Hex = { q: 5, r: 2 };
const WEST_MID: Hex = { q: 6, r: 2 };
const WEST_DEEP: Hex = { q: 6, r: 3 };
const OFF_MAP: Hex = { q: 99, r: 99 };

function unitHex(units: readonly { id: string; hex: Hex }[], id: string): Hex | undefined {
  return units.find((unit) => unit.id === id)?.hex;
}

beforeAll(() => {
  delete process.env.DATABASE_URL;
});

beforeEach(() => {
  signIn("auth0|player-one");
  intentAllowedMock.mockResolvedValue(true);
});

afterEach(() => {
  getAuth0Mock.mockReset();
});

async function loadOk(matchId: string): Promise<BoardView> {
  const result = await loadBoard(matchId);
  if (result.status !== "ok") throw new Error(`expected ok, got ${result.status}`);
  return result.board;
}

describe("Server Action intent channel against the in-memory store", () => {
  it("creates a match for the caller and returns the authored roster", async () => {
    const board = await newGame();
    const loaded = await loadOk(board.matchId);
    expect(board.matchId).not.toBe("");
    expect(loaded.matchId).toBe(board.matchId);
    expect(loaded.units.length).toBe(FIRST_SLICE_UNITS.length);
  });

  it("surfaces per-faction city scores reflecting the authored holdings", async () => {
    const board = await newGame();
    expect([board.scores?.macedon ?? 0, board.scores?.persia ?? 0].every((s) => s > 0)).toBe(true);
  });

  it("does not flag a freshly seeded match as incompatible", async () => {
    const board = await newGame();
    expect(board.incompatible ?? false).toBe(false);
  });

  it("applies a legal move and persists it", async () => {
    const board = await newGame();
    const targets = await targetsFor(board.matchId, PHALANX);
    const dest = targets.reachable[0]!;
    const outcome = await move(board.matchId, PHALANX, dest);
    const reloaded = await loadOk(board.matchId);
    expect(outcome.ok).toBe(true);
    expect(hexKey(unitHex(outcome.units, PHALANX)!)).toBe(hexKey(dest));
    expect(hexKey(unitHex(reloaded.units, PHALANX)!)).toBe(hexKey(dest));
  });

  it("records a player move in the authoritative event log", async () => {
    const board = await newGame();
    const targets = await targetsFor(board.matchId, PHALANX);
    await move(board.matchId, PHALANX, targets.reachable[0]!);
    const reloaded = await loadOk(board.matchId);
    expect(reloaded.events.at(-1)).toMatchObject({ kind: "move", unitId: PHALANX });
  });

  it("cannot move onto an unowned city that still has HP", async () => {
    const board = await newGame();
    const targets = await targetsFor(board.matchId, COMPANIONS);
    const outcome = await move(board.matchId, COMPANIONS, ILIUM);
    const reloaded = await loadOk(board.matchId);
    expect(targets.reachable.some((hex) => hexKey(hex) === hexKey(ILIUM))).toBe(false);
    expect(outcome.ok).toBe(false);
    expect(hexKey(unitHex(reloaded.units, COMPANIONS)!)).toBe(hexKey(COMPANIONS_START));
  });

  it("rejects ending a move on a tile held by a friendly unit", async () => {
    const board = await newGame();
    const outcome = await move(board.matchId, COMPANIONS, PHALANX_START);
    const reloaded = await loadOk(board.matchId);
    expect(outcome.ok).toBe(false);
    expect(hexKey(unitHex(reloaded.units, COMPANIONS)!)).toBe(hexKey(COMPANIONS_START));
  });

  it("does not project an enemy zone of control across the Granicus", async () => {
    const board = await newGame();
    const targets = await targetsFor(board.matchId, COMPANIONS);
    const keys = targets.reachable.map((hex) => hexKey(hex));
    expect(keys).toContain(hexKey(WEST_MID));
    expect(keys).toContain(hexKey(WEST_DEEP));
  });

  it("reports a unit as spent once it has no move or attack left", async () => {
    const board = await newGame();
    const outcome = await move(board.matchId, "mac-archers", { q: 1, r: 0 });
    expect(outcome.spent).toContain("mac-archers");
  });

  it("does not list a unit that still has moves as spent", async () => {
    const board = await newGame();
    expect(board.spent).not.toContain(COMPANIONS);
  });

  it("keeps moving across a bank the river shields from enemy zone of control", async () => {
    const board = await newGame();
    const entered = await move(board.matchId, PHALANX, WEST_MID);
    const targets = await targetsFor(board.matchId, PHALANX);
    expect(entered.ok).toBe(true);
    expect(entered.movement[PHALANX]).toBe(1);
    expect(targets.reachable.length).toBeGreaterThan(0);
  });

  it("a melee that crosses the Granicus spends all its moves and cannot attack", async () => {
    const board = await newGame();
    const crossed = await move(board.matchId, PER_IMMORTALS, WEST_MID);
    const targets = await targetsFor(board.matchId, PER_IMMORTALS);
    const blocked = await attack(board.matchId, PER_IMMORTALS, COMPANIONS);
    expect(crossed.ok).toBe(true);
    expect(crossed.movement[PER_IMMORTALS]).toBe(0);
    expect(targets.attackable).toHaveLength(0);
    expect(blocked.ok).toBe(false);
  });

  it("rejects an out-of-range move and leaves the unit where it started", async () => {
    const board = await newGame();
    const outcome = await move(board.matchId, PHALANX, OFF_MAP);
    const reloaded = await loadOk(board.matchId);
    expect(outcome.ok).toBe(false);
    expect(hexKey(unitHex(reloaded.units, PHALANX)!)).toBe(hexKey(PHALANX_START));
  });

  it("ends the turn, runs Persia's AI, and restores movement on the next round", async () => {
    const board = await newGame();
    const targets = await targetsFor(board.matchId, PHALANX);
    await move(board.matchId, PHALANX, targets.reachable[0]!);
    const after = await endTurn(board.matchId);
    const persiaActed = after.units.some(
      (unit) => unit.owner === "persia" && unit.hasAttackedThisTurn === true,
    );
    const persiaLogged = after.events.some((event) => event.faction === "persia");
    expect(after.turn).toBe(2);
    expect(after.activeFaction).toBe("macedon");
    expect(after.movement[PHALANX]).toBe(2);
    expect(persiaActed).toBe(true);
    expect(persiaLogged).toBe(true);
  });

  it("resolves a legal adjacent attack with seeded damage", async () => {
    const board = await newGame();
    const targets = await targetsFor(board.matchId, COMPANIONS);
    const outcome = await attack(board.matchId, COMPANIONS, PER_CAVALRY);
    expect(targets.attackable.length).toBeGreaterThan(0);
    expect(outcome.ok).toBe(true);
    expect(outcome.defenderDamage!).toBeGreaterThan(0);
  });

  it("records a resolved attack in the authoritative event log", async () => {
    const board = await newGame();
    await attack(board.matchId, COMPANIONS, PER_CAVALRY);
    const reloaded = await loadOk(board.matchId);
    expect(reloaded.events.at(-1)).toMatchObject({
      kind: "attack",
      unitId: COMPANIONS,
      targetId: PER_CAVALRY,
    });
  });

  it("rejects an attack on a friendly unit", async () => {
    const board = await newGame();
    const outcome = await attack(board.matchId, COMPANIONS, PHALANX);
    expect(outcome.ok).toBe(false);
  });

  it("rejects a move on a match owned by another signed-in user", async () => {
    const board = await newGame();
    signIn("auth0|intruder");
    const outcome = await move(board.matchId, PHALANX, PHALANX_START);
    expect(outcome.ok).toBe(false);
  });

  it("rejects an unauthenticated caller", async () => {
    signIn(null);
    await expect(newGame()).rejects.toThrow();
  });

  it("rejects an intent that exceeds the per-user rate limit", async () => {
    const board = await newGame();
    intentAllowedMock.mockResolvedValueOnce(false);
    const outcome = await move(board.matchId, PHALANX, PHALANX_START);
    expect(outcome.rateLimited).toBe(true);
  });
});

describe("loadBoard not-found handling", () => {
  it("reports not-found for an unknown match id", async () => {
    const result = await loadBoard("no-such-match");
    expect(result.status).toBe("not-found");
  });

  it("reports not-found for a match owned by another player", async () => {
    const other = await newGame();
    signIn("auth0|player-two");
    const result = await loadBoard(other.matchId);
    expect(result.status).toBe("not-found");
  });

  it("creates and returns the default match when given no id", async () => {
    const result = await loadBoard();
    expect(result.status).toBe("ok");
  });
});

describe("divergence resolution", () => {
  it("surfaces the Granicus node on a fresh match", async () => {
    const board = await newGame();
    expect(board.pendingDivergence?.id).toBe("granicus");
  });

  it("applies the chosen option and clears the pending node", async () => {
    const board = await newGame();
    const outcome = await resolveDivergence(board.matchId, "granicus", "reckless");
    expect(outcome.ok).toBe(true);
    expect(outcome.board.pendingDivergence).toBeUndefined();
    expect(outcome.board.units.find((unit) => unit.id === PHALANX)?.morale).toBe(93);
  });

  it("forfeits the turn's movement when crossing cautiously", async () => {
    const board = await newGame();
    const outcome = await resolveDivergence(board.matchId, "granicus", "cautious");
    expect(outcome.board.movement[PHALANX]).toBe(0);
  });

  it("wounds the Companions on the reckless charge", async () => {
    const board = await newGame();
    const outcome = await resolveDivergence(board.matchId, "granicus", "reckless");
    expect(outcome.board.units.find((unit) => unit.id === "mac-companions")?.hp).toBe(60);
  });

  it("cannot be resolved a second time", async () => {
    const board = await newGame();
    await resolveDivergence(board.matchId, "granicus", "reckless");
    const again = await resolveDivergence(board.matchId, "granicus", "cautious");
    expect(again.ok).toBe(false);
  });

  it("rejects an unknown option", async () => {
    const board = await newGame();
    const outcome = await resolveDivergence(board.matchId, "granicus", "flee");
    expect(outcome.ok).toBe(false);
  });
});

describe("incite", () => {
  const loyaltyOf = (board: BoardView, id: string) =>
    board.cities.find((city) => city.id === id)?.loyalty ?? 0;

  it("nudges a city's loyalty toward the player", async () => {
    const board = await newGame();
    const before = loyaltyOf(board, "zeleia");
    const outcome = await incite(board.matchId, "zeleia");
    expect(loyaltyOf(outcome.board, "zeleia") - before).toBe(INCITE_PRESSURE);
  });

  it("spends the turn's incite so none remains", async () => {
    const board = await newGame();
    const outcome = await incite(board.matchId, "zeleia");
    expect(outcome.board.canIncite).toBe(false);
  });

  it("rejects a second incite in the same turn", async () => {
    const board = await newGame();
    await incite(board.matchId, "zeleia");
    const again = await incite(board.matchId, "dascylium");
    expect(again.ok).toBe(false);
  });

  it("rejects inciting an unknown city", async () => {
    const board = await newGame();
    const outcome = await incite(board.matchId, "atlantis");
    expect(outcome.ok).toBe(false);
  });

  it("rejects an incite that is rate limited", async () => {
    const board = await newGame();
    intentAllowedMock.mockResolvedValueOnce(false);
    const outcome = await incite(board.matchId, "zeleia");
    expect(outcome.rateLimited).toBe(true);
  });
});

describe("attackCity", () => {
  it("rejects attacking your own city", async () => {
    const board = await newGame();
    const macedonUnit = board.units.find((unit) => unit.owner === "macedon");
    const outcome = await attackCity(board.matchId, macedonUnit?.id ?? "", "pella");
    expect(outcome.ok).toBe(false);
  });

  it("rejects attacking an enemy city out of range", async () => {
    const board = await newGame();
    const macedonUnit = board.units.find((unit) => unit.owner === "macedon");
    const outcome = await attackCity(board.matchId, macedonUnit?.id ?? "", "sardis");
    expect(outcome.ok).toBe(false);
  });
});
