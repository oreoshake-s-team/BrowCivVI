import { describe, it, expect } from "vitest";
import { neighbor, directionTo } from "./hex";

describe("neighbor", () => {
  it("steps east for direction 0", () => {
    expect(neighbor({ q: 0, r: 0 }, 0)).toEqual({ q: 1, r: 0 });
  });

  it("steps to the upper-right for direction 1", () => {
    expect(neighbor({ q: 0, r: 0 }, 1)).toEqual({ q: 1, r: -1 });
  });

  it("steps west for direction 3", () => {
    expect(neighbor({ q: 2, r: 2 }, 3)).toEqual({ q: 1, r: 2 });
  });
});

describe("directionTo", () => {
  it("identifies the direction of an adjacent hex", () => {
    expect(directionTo({ q: 0, r: 0 }, { q: 0, r: 1 })).toBe(5);
  });

  it("returns null for a non-adjacent hex", () => {
    expect(directionTo({ q: 0, r: 0 }, { q: 2, r: 0 })).toBeNull();
  });

  it("returns null for the same hex", () => {
    expect(directionTo({ q: 1, r: 1 }, { q: 1, r: 1 })).toBeNull();
  });
});
