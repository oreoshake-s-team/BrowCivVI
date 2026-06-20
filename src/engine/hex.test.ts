import { describe, it, expect } from "vitest";
import { neighbor, neighbors, directionTo, hexDistance, HEX_DIRECTION_COUNT } from "./hex";

describe("neighbor", () => {
  it("steps east for direction 0 regardless of row parity", () => {
    expect(neighbor({ q: 2, r: 2 }, 0)).toEqual({ q: 3, r: 2 });
  });

  it("steps west for direction 3 regardless of row parity", () => {
    expect(neighbor({ q: 2, r: 3 }, 3)).toEqual({ q: 1, r: 3 });
  });

  it("steps up-left for the north-east diagonal on an even row", () => {
    expect(neighbor({ q: 2, r: 2 }, 1)).toEqual({ q: 2, r: 1 });
  });

  it("steps up-right for the north-east diagonal on an odd row", () => {
    expect(neighbor({ q: 2, r: 3 }, 1)).toEqual({ q: 3, r: 2 });
  });

  it("steps down-left for the south-east diagonal on an even row", () => {
    expect(neighbor({ q: 2, r: 2 }, 5)).toEqual({ q: 2, r: 3 });
  });

  it("steps down-right for the south-east diagonal on an odd row", () => {
    expect(neighbor({ q: 2, r: 3 }, 5)).toEqual({ q: 3, r: 4 });
  });

  it("uses parity from a negative row index", () => {
    expect(neighbor({ q: 0, r: -1 }, 1)).toEqual({ q: 1, r: -2 });
  });
});

describe("neighbors", () => {
  it("returns one hex per direction", () => {
    expect(neighbors({ q: 4, r: 3 })).toHaveLength(HEX_DIRECTION_COUNT);
  });
});

describe("hexDistance", () => {
  it("is zero between a hex and itself", () => {
    expect(hexDistance({ q: 3, r: 2 }, { q: 3, r: 2 })).toBe(0);
  });

  it("is one between adjacent hexes", () => {
    expect(hexDistance({ q: 2, r: 3 }, neighbor({ q: 2, r: 3 }, 2))).toBe(1);
  });

  it("counts the shortest offset path across rows of differing parity", () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 0, r: 3 })).toBe(3);
  });

  it("is symmetric", () => {
    expect(hexDistance({ q: 1, r: 1 }, { q: 4, r: 5 })).toBe(
      hexDistance({ q: 4, r: 5 }, { q: 1, r: 1 }),
    );
  });
});

describe("directionTo", () => {
  it("round-trips with neighbor on an odd row", () => {
    expect(directionTo({ q: 2, r: 3 }, neighbor({ q: 2, r: 3 }, 1))).toBe(1);
  });

  it("returns null for a non-adjacent hex", () => {
    expect(directionTo({ q: 0, r: 0 }, { q: 2, r: 0 })).toBeNull();
  });

  it("returns null for the same hex", () => {
    expect(directionTo({ q: 1, r: 1 }, { q: 1, r: 1 })).toBeNull();
  });
});
