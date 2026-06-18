import { describe, it, expect } from "vitest";
import type { City } from "../map/types";
import { createGameMap } from "../map/types";
import type { Citation } from "./citation";
import { FIRST_SLICE_MAP } from "@/content/firstSlice";
import {
  validateFirstSlice,
  geographyErrors,
  anachronismErrors,
  citationErrors,
  cityTerrainErrors,
  chronologyWarnings,
} from "./accuracy";

const CIT: Citation = {
  claim: "test",
  source: { title: "Test", url: "https://example.test", type: "reference" },
  confidence: "high",
};

function city(
  id: string,
  q: number,
  r: number,
  opts: { bce?: number; dated?: boolean; cited?: boolean } = {},
): City {
  const dated = opts.dated ?? true;
  const cited = opts.cited ?? true;
  let result: City = { id, name: id, hex: { q, r }, owner: "persia", value: 10, defense: 5 };
  if (dated) result = { ...result, firstAttestedBce: opts.bce ?? 1000 };
  if (cited) result = { ...result, citation: CIT };
  return result;
}

describe("validateFirstSlice", () => {
  it("passes the authored first-slice map with no hard errors", () => {
    expect(validateFirstSlice(FIRST_SLICE_MAP).errors).toEqual([]);
  });

  it("raises no chronology warnings for the authored map", () => {
    expect(validateFirstSlice(FIRST_SLICE_MAP).warnings).toEqual([]);
  });
});

describe("geographyErrors", () => {
  it("flags Pella placed east of the Hellespont", () => {
    const map = createGameMap([], [city("pella", 9, 1), city("sestos", 4, 0)]);
    expect(geographyErrors(map).some((error) => /Pella/.test(error))).toBe(true);
  });

  it("flags a map with no river", () => {
    const map = createGameMap([], []);
    expect(geographyErrors(map).some((error) => /Granicus river/.test(error))).toBe(true);
  });

  it("flags Sparta placed north of Corinth", () => {
    const map = createGameMap([], [city("sparta", 1, 2), city("corinth", 1, 6)]);
    expect(geographyErrors(map).some((error) => /Sparta must lie/.test(error))).toBe(true);
  });

  it("flags an Aegean rendered as a thin sliver", () => {
    const map = createGameMap(
      [{ hex: { q: 3, r: 5 }, terrain: "coast" }],
      [city("athens", 2, 5), city("ilium", 5, 2)],
    );
    expect(geographyErrors(map).some((error) => /sliver/.test(error))).toBe(true);
  });
});

describe("anachronismErrors", () => {
  it("flags a city founded after the campaign", () => {
    const map = createGameMap([], [city("seleucia", 0, 0, { bce: 305 })]);
    expect(anachronismErrors(map).some((error) => /not yet founded/.test(error))).toBe(true);
  });

  it("flags a city with no attestation date", () => {
    const map = createGameMap([], [city("nowhere", 0, 0, { dated: false })]);
    expect(anachronismErrors(map).some((error) => /no attestation date/.test(error))).toBe(true);
  });
});

describe("citationErrors", () => {
  it("flags a city with no citation", () => {
    const map = createGameMap([], [city("uncited", 0, 0, { cited: false })]);
    expect(citationErrors(map)).toHaveLength(1);
  });
});

describe("cityTerrainErrors", () => {
  it("flags a city placed on a water tile", () => {
    const map = createGameMap([{ hex: { q: 0, r: 0 }, terrain: "coast" }], [city("porto", 0, 0)]);
    expect(cityTerrainErrors(map).some((error) => /non-land/.test(error))).toBe(true);
  });

  it("accepts a city on a land tile", () => {
    const map = createGameMap([{ hex: { q: 0, r: 0 }, terrain: "plains" }], [city("inland", 0, 0)]);
    expect(cityTerrainErrors(map)).toEqual([]);
  });
});

describe("chronologyWarnings", () => {
  it("warns about a city founded within ~50 years of the campaign", () => {
    const map = createGameMap([], [city("recent", 0, 0, { bce: 360 })]);
    expect(chronologyWarnings(map)).toHaveLength(1);
  });
});
