import { describe, it, expect } from "vitest";
import type { UnitType } from "./types";
import { effectiveCapabilities } from "./types";
import { SETTLER, PHALANGITE } from "./fixtures";

describe("effectiveCapabilities", () => {
  it("includes the class default capabilities", () => {
    expect(effectiveCapabilities(PHALANGITE).has("meleeAttack")).toBe(true);
  });

  it("adds a unit type's extra capabilities", () => {
    expect(effectiveCapabilities(SETTLER).has("settle")).toBe(true);
  });

  it("keeps the universal move alongside extras", () => {
    expect(effectiveCapabilities(SETTLER).has("move")).toBe(true);
  });

  it("lets every unit heal, not just support units", () => {
    expect(effectiveCapabilities(PHALANGITE).has("heal")).toBe(true);
  });

  it("deduplicates an extra capability that repeats a class default", () => {
    const redundant: UnitType = {
      id: "x",
      name: "X",
      class: "melee",
      movement: 2,
      strength: 10,
      capabilities: ["meleeAttack"],
    };
    expect(effectiveCapabilities(redundant).size).toBe(3);
  });
});
