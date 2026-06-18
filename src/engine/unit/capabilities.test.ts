import { describe, it, expect } from "vitest";
import { UNIVERSAL_CAPABILITIES, CLASS_CAPABILITIES } from "./capabilities";

describe("CLASS_CAPABILITIES", () => {
  it("gives melee units a melee attack", () => {
    expect(CLASS_CAPABILITIES.melee).toContain("meleeAttack");
  });

  it("gives siege units a bombard", () => {
    expect(CLASS_CAPABILITIES.siege).toContain("bombard");
  });

  it("does not grant settle by class default", () => {
    expect(CLASS_CAPABILITIES.civilian).not.toContain("settle");
  });

  it("leaves the universal capabilities out of the class-specific sets", () => {
    expect(Object.values(CLASS_CAPABILITIES).every((caps) => !caps.includes("move"))).toBe(true);
  });
});

describe("UNIVERSAL_CAPABILITIES", () => {
  it("lets every unit move", () => {
    expect(UNIVERSAL_CAPABILITIES).toContain("move");
  });

  it("lets every unit heal", () => {
    expect(UNIVERSAL_CAPABILITIES).toContain("heal");
  });
});
