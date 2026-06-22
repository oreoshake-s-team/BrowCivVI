import { describe, it, expect } from "vitest";
import { cityAllegiance, sigilId, starPoints } from "./cityMarkers";

describe("cityAllegiance", () => {
  it("maps a Macedon owner to its allegiance", () => {
    expect(cityAllegiance("macedon")).toBe("macedon");
  });

  it("maps a Persia owner to its allegiance", () => {
    expect(cityAllegiance("persia")).toBe("persia");
  });

  it("treats an unowned city as neutral", () => {
    expect(cityAllegiance(null)).toBe("neutral");
  });

  it("treats an unknown owner as neutral", () => {
    expect(cityAllegiance("thrace")).toBe("neutral");
  });
});

describe("sigilId", () => {
  it("namespaces the sigil id by allegiance", () => {
    expect(sigilId("persia")).toBe("city-sigil-persia");
  });
});

describe("starPoints", () => {
  it("emits two vertices per point of the star", () => {
    expect(starPoints(12, 12, 11, 4.5, 16).split(" ")).toHaveLength(32);
  });
});
