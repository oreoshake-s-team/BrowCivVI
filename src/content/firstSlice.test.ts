import { describe, it, expect } from "vitest";
import { FIRST_SLICE_MAP, FIRST_SLICE_REGIONS, FIRST_SLICE_UNITS } from "./firstSlice";

describe("FIRST_SLICE_MAP", () => {
  it("holds Macedon's capital at Pella", () => {
    expect(FIRST_SLICE_MAP.cities.get("pella")?.owner).toBe("macedon");
  });

  it("marks Dascylium with Persian affinity", () => {
    expect(FIRST_SLICE_MAP.cities.get("dascylium")?.affinity).toBe("persia");
  });

  it("marks Greek Ephesus with Macedon affinity", () => {
    expect(FIRST_SLICE_MAP.cities.get("ephesus")?.affinity).toBe("macedon");
  });

  it("authors all sixteen named cities", () => {
    expect(FIRST_SLICE_MAP.cities.size).toBe(16);
  });

  it("models Sparta as an independent holdout (no owner)", () => {
    expect(FIRST_SLICE_MAP.cities.get("sparta")?.owner).toBeNull();
  });

  it("gives independent Sparta a neutral affinity", () => {
    expect(FIRST_SLICE_MAP.cities.get("sparta")?.affinity).toBe("neutral");
  });
});

describe("FIRST_SLICE_REGIONS", () => {
  it("includes the Granicus as a cited river feature", () => {
    expect(FIRST_SLICE_REGIONS.find((region) => region.id === "granicus")?.kind).toBe("river");
  });

  it("labels the Aegean Sea", () => {
    expect(FIRST_SLICE_REGIONS.find((region) => region.id === "aegean")?.labelHex).toBeDefined();
  });

  it("keeps only the tile-sized Aegean islands", () => {
    expect(FIRST_SLICE_REGIONS.filter((region) => region.kind === "island")).toHaveLength(2);
  });
});

describe("FIRST_SLICE_UNITS", () => {
  it("places Alexander's companions on the approach to the river", () => {
    expect(FIRST_SLICE_UNITS.find((unit) => unit.id === "mac-companions")?.hex).toEqual({
      q: 6,
      r: 1,
    });
  });
});
