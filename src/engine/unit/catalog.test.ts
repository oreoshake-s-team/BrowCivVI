import { describe, it, expect } from "vitest";
import { unitTypeById } from "./catalog";

describe("unitTypeById", () => {
  it("resolves a known unit type's class", () => {
    expect(unitTypeById("pezhetairos")?.class).toBe("melee");
  });

  it("resolves the Persian cavalry as heavy cavalry", () => {
    expect(unitTypeById("persian-cavalry")?.class).toBe("heavyCavalry");
  });

  it("returns undefined for an unknown type id", () => {
    expect(unitTypeById("war-elephant")).toBeUndefined();
  });
});
