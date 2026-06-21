import { describe, it, expect } from "vitest";
import { hasUnitSprite, spriteIdForClass, UNIT_SPRITE_PATHS } from "./unitSprites";

describe("spriteIdForClass", () => {
  it("namespaces the class into a stable symbol id", () => {
    expect(spriteIdForClass("heavyCavalry")).toBe("unit-sprite-heavyCavalry");
  });
});

describe("UNIT_SPRITE_PATHS", () => {
  it("maps every unit class to a non-empty path starting at a move command", () => {
    const invalid = Object.values(UNIT_SPRITE_PATHS).filter((d) => !d.startsWith("M"));
    expect(invalid).toHaveLength(0);
  });
});

describe("hasUnitSprite", () => {
  it("is true for a mapped class", () => {
    expect(hasUnitSprite("ranged")).toBe(true);
  });

  it("is false for an undefined class", () => {
    expect(hasUnitSprite(undefined)).toBe(false);
  });
});
