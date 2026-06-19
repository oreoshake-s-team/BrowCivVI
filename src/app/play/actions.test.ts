import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FIRST_SLICE_UNITS } from "@/content/firstSlice";
import type { Hex } from "@/engine/hex";
import { hexKey } from "@/engine/map/types";
import { loadBoard, newGame, move, attack, targetsFor } from "./actions";

const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }));

vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: (name: string) => {
        const value = jar.get(name);
        return value === undefined ? undefined : { value };
      },
      set: (name: string, value: string) => {
        jar.set(name, value);
      },
    }),
}));

const PHALANX = "mac-phalanx";
const COMPANIONS = "mac-companions";
const PER_CAVALRY = "per-cavalry";
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
  jar.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Server Action intent channel against the in-memory store", () => {
  it("creates a match for the caller and returns the authored roster", async () => {
    const board = await newGame();
    const loaded = await loadBoard(board.matchId);
    expect(board.matchId).not.toBe("");
    expect(loaded.matchId).toBe(board.matchId);
    expect(loaded.units.length).toBe(FIRST_SLICE_UNITS.length);
  });

  it("applies a legal move and persists it", async () => {
    const board = await newGame();
    const targets = await targetsFor(board.matchId, PHALANX);
    const dest = targets.reachable[0]!;
    const outcome = await move(board.matchId, PHALANX, dest);
    const reloaded = await loadBoard(board.matchId);
    expect(outcome.ok).toBe(true);
    expect(hexKey(unitHex(outcome.units, PHALANX)!)).toBe(hexKey(dest));
    expect(hexKey(unitHex(reloaded.units, PHALANX)!)).toBe(hexKey(dest));
  });

  it("moves a unit through a friendly unit to a tile beyond it", async () => {
    const board = await newGame();
    const targets = await targetsFor(board.matchId, COMPANIONS);
    const outcome = await move(board.matchId, COMPANIONS, ABYDOS);
    const reloaded = await loadBoard(board.matchId);
    expect(targets.reachable.some((hex) => hexKey(hex) === hexKey(ABYDOS))).toBe(true);
    expect(outcome.ok).toBe(true);
    expect(hexKey(unitHex(reloaded.units, COMPANIONS)!)).toBe(hexKey(ABYDOS));
  });

  it("rejects ending a move on a tile held by a friendly unit", async () => {
    const board = await newGame();
    const outcome = await move(board.matchId, COMPANIONS, PHALANX_START);
    const reloaded = await loadBoard(board.matchId);
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

  it("rejects an out-of-range move and leaves the unit where it started", async () => {
    const board = await newGame();
    const outcome = await move(board.matchId, PHALANX, OFF_MAP);
    const reloaded = await loadBoard(board.matchId);
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

  it("rejects a move on a match the caller does not own", async () => {
    const board = await newGame();
    jar.clear();
    const outcome = await move(board.matchId, PHALANX, PHALANX_START);
    expect(outcome.ok).toBe(false);
  });
});
