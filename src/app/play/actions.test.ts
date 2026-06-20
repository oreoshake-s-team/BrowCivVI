import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FIRST_SLICE_UNITS } from "@/content/firstSlice";
import type { Hex } from "@/engine/hex";
import { hexKey } from "@/engine/map/types";
import { loadBoard, newGame, move, attack, targetsFor, type BoardView } from "./actions";

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
const ABYDOS: Hex = { q: 5, r: 0 };
const ZOC_STOP: Hex = { q: 6, r: 2 };
const BEYOND_ZOC: Hex = { q: 6, r: 3 };
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

  it("moves a unit through a friendly unit to a tile beyond it", async () => {
    const board = await newGame();
    const targets = await targetsFor(board.matchId, COMPANIONS);
    const outcome = await move(board.matchId, COMPANIONS, ABYDOS);
    const reloaded = await loadOk(board.matchId);
    expect(targets.reachable.some((hex) => hexKey(hex) === hexKey(ABYDOS))).toBe(true);
    expect(outcome.ok).toBe(true);
    expect(hexKey(unitHex(reloaded.units, COMPANIONS)!)).toBe(hexKey(ABYDOS));
  });

  it("rejects ending a move on a tile held by a friendly unit", async () => {
    const board = await newGame();
    const outcome = await move(board.matchId, COMPANIONS, PHALANX_START);
    const reloaded = await loadOk(board.matchId);
    expect(outcome.ok).toBe(false);
    expect(hexKey(unitHex(reloaded.units, COMPANIONS)!)).toBe(hexKey(COMPANIONS_START));
  });

  it("halts movement on entering an enemy zone of control", async () => {
    const board = await newGame();
    const targets = await targetsFor(board.matchId, COMPANIONS);
    const keys = targets.reachable.map((hex) => hexKey(hex));
    expect(keys).toContain(hexKey(ZOC_STOP));
    expect(keys).not.toContain(hexKey(BEYOND_ZOC));
  });

  it("keeps its move points but cannot move again after entering a zone of control", async () => {
    const board = await newGame();
    const entered = await move(board.matchId, PHALANX, ZOC_STOP);
    const again = await move(board.matchId, PHALANX, PHALANX_START);
    expect(entered.ok).toBe(true);
    expect(entered.movement[PHALANX]).toBe(1);
    expect(again.ok).toBe(false);
  });

  it("a melee that crosses the Granicus spends all its moves and cannot attack", async () => {
    const board = await newGame();
    const crossed = await move(board.matchId, PER_IMMORTALS, ZOC_STOP);
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

  it("resolves a legal adjacent attack with seeded damage", async () => {
    const board = await newGame();
    const targets = await targetsFor(board.matchId, COMPANIONS);
    const outcome = await attack(board.matchId, COMPANIONS, PER_CAVALRY);
    expect(targets.attackable.length).toBeGreaterThan(0);
    expect(outcome.ok).toBe(true);
    expect(outcome.defenderDamage!).toBeGreaterThan(0);
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
