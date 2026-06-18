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

  it("authors all thirteen named cities", () => {
    expect(FIRST_SLICE_MAP.cities.size).toBe(13);
  });
});

describe("FIRST_SLICE_REGIONS", () => {
  it("includes the Granicus as a cited river feature", () => {
    expect(FIRST_SLICE_REGIONS.find((region) => region.id === "granicus")?.kind).toBe("river");
  });
});

describe("FIRST_SLICE_UNITS", () => {
  it("places Alexander's companions facing east toward the river", () => {
    expect(FIRST_SLICE_UNITS.find((unit) => unit.id === "mac-companions")?.facing).toBe(0);
  });
});
