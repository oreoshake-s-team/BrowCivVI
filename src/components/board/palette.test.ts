import { describe, it, expect } from "vitest";
import { TERRAIN_COLORS, CLASS_GLYPHS, factionStyle } from "./palette";

describe("TERRAIN_COLORS", () => {
  it("assigns a color to plains", () => {
    expect(TERRAIN_COLORS.plains).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("CLASS_GLYPHS", () => {
  it("uses M for melee", () => {
    expect(CLASS_GLYPHS.melee).toBe("M");
  });

  it("uses C for heavy cavalry", () => {
    expect(CLASS_GLYPHS.heavyCavalry).toBe("C");
  });
});

describe("factionStyle", () => {
  it("gives Macedon and Persia distinct fills", () => {
    expect(factionStyle("macedon").fill).not.toBe(factionStyle("persia").fill);
  });

  it("falls back to a neutral style for an unknown owner", () => {
    expect(factionStyle("scythia").fill).toBe(factionStyle(null).fill);
  });
});
