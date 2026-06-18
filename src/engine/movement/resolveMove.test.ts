import { describe, it, expect } from "vitest";
import { createGameMap, hexKey } from "../map/types";
import { resolveMove, availableMoves } from "./resolveMove";

const MAP = createGameMap(
  [
    { hex: { q: 0, r: 0 }, terrain: "plains" },
    { hex: { q: 1, r: 0 }, terrain: "plains" },
    { hex: { q: 0, r: 1 }, terrain: "mountain" },
  ],
  [],
);

const base = { from: { q: 0, r: 0 }, movement: 2, domain: "land", map: MAP } as const;

describe("resolveMove", () => {
  it("accepts a move to a reachable hex", () => {
    const result = resolveMove({ ...base, unitId: "u1", to: { q: 1, r: 0 } });
    expect(result.ok).toBe(true);
  });

  it("reports the remaining movement after a legal move", () => {
    const result = resolveMove({ ...base, unitId: "u1", to: { q: 1, r: 0 } });
    expect(result.ok && result.remaining).toBe(1);
  });

  it("rejects a move to an unreachable hex", () => {
    const result = resolveMove({ ...base, unitId: "u1", to: { q: 0, r: 1 } });
    expect(result.ok).toBe(false);
  });
});

describe("availableMoves", () => {
  it("lists a reachable plains hex", () => {
    const moves = availableMoves(base).map(hexKey);
    expect(moves).toContain("1,0");
  });

  it("omits an impassable mountain", () => {
    const moves = availableMoves(base).map(hexKey);
    expect(moves).not.toContain("0,1");
  });
});
