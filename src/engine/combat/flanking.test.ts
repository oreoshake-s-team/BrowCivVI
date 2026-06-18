import { describe, it, expect } from "vitest";
import type { Hex } from "../hex";
import { oppositeHex, isFlanked } from "./flanking";

const allyAt = (keys: readonly string[]) => (hex: Hex) => keys.includes(`${hex.q},${hex.r}`);

describe("oppositeHex", () => {
  it("reflects the attacker across the defender", () => {
    expect(oppositeHex({ q: 1, r: 1 }, { q: 0, r: 1 })).toEqual({ q: 2, r: 1 });
  });
});

describe("isFlanked", () => {
  it("flags a defender pinned between two enemies", () => {
    expect(isFlanked({ q: 1, r: 1 }, { q: 0, r: 1 }, allyAt(["2,1"]))).toBe(true);
  });

  it("is not flanked when no ally sits opposite the attacker", () => {
    expect(isFlanked({ q: 1, r: 1 }, { q: 0, r: 1 }, allyAt([]))).toBe(false);
  });

  it("is not flanked when an ally is adjacent but not directly opposite", () => {
    expect(isFlanked({ q: 1, r: 1 }, { q: 0, r: 1 }, allyAt(["1,2"]))).toBe(false);
  });
});
