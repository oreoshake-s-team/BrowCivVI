import { describe, it, expect } from "vitest";
import { DEFAULT_CAPABILITIES } from "./capabilities";

describe("DEFAULT_CAPABILITIES", () => {
  it("gives melee units a melee attack", () => {
    expect(DEFAULT_CAPABILITIES.melee).toContain("meleeAttack");
  });

  it("gives siege units a bombard", () => {
    expect(DEFAULT_CAPABILITIES.siege).toContain("bombard");
  });

  it("does not grant settle by class default", () => {
    expect(DEFAULT_CAPABILITIES.civilian).not.toContain("settle");
  });

  it("lets every class move", () => {
    expect(Object.values(DEFAULT_CAPABILITIES).every((caps) => caps.includes("move"))).toBe(true);
  });
});
