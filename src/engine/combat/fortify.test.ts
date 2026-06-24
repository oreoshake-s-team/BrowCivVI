import { describe, it, expect } from "vitest";
import { FORTIFY_LEVEL_1_BONUS, FORTIFY_LEVEL_2_BONUS, fortifyStrengthBonus } from "./fortify";

describe("fortifyStrengthBonus", () => {
  it("is zero for an unfortified unit", () => {
    expect(fortifyStrengthBonus(0)).toBe(0);
  });

  it("is zero when the fortify count is undefined", () => {
    expect(fortifyStrengthBonus(undefined)).toBe(0);
  });

  it("gives the first-turn bonus after one turn", () => {
    expect(fortifyStrengthBonus(1)).toBe(FORTIFY_LEVEL_1_BONUS);
  });

  it("gives the capped bonus after two turns", () => {
    expect(fortifyStrengthBonus(2)).toBe(FORTIFY_LEVEL_2_BONUS);
  });

  it("does not exceed the cap beyond two turns", () => {
    expect(fortifyStrengthBonus(5)).toBe(FORTIFY_LEVEL_2_BONUS);
  });
});
