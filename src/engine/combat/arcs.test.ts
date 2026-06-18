import { describe, it, expect } from "vitest";
import { arcFromDirections, combatArc } from "./arcs";

describe("arcFromDirections", () => {
  it("classifies a head-on attack as front", () => {
    expect(arcFromDirections(0, 0)).toBe("front");
  });

  it("classifies an adjacent direction as flank", () => {
    expect(arcFromDirections(0, 1)).toBe("flank");
  });

  it("classifies a two-step offset as flank", () => {
    expect(arcFromDirections(0, 2)).toBe("flank");
  });

  it("classifies the opposite direction as rear", () => {
    expect(arcFromDirections(0, 3)).toBe("rear");
  });

  it("treats the offset symmetrically for a rotated facing", () => {
    expect(arcFromDirections(2, 5)).toBe("rear");
  });
});

describe("combatArc", () => {
  it("derives the front arc from adjacent hex positions", () => {
    expect(combatArc(0, { q: 0, r: 0 }, { q: 1, r: 0 })).toBe("front");
  });

  it("derives the rear arc when struck from behind", () => {
    expect(combatArc(0, { q: 0, r: 0 }, { q: -1, r: 0 })).toBe("rear");
  });

  it("returns null when the attacker is not adjacent", () => {
    expect(combatArc(0, { q: 0, r: 0 }, { q: 3, r: 0 })).toBeNull();
  });
});
