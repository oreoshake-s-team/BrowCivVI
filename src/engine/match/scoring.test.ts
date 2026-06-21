import { describe, it, expect } from "vitest";
import type { CityState } from "./cities";
import { CITY_SACKED_VALUE_FRACTION, cityScore, matchCityScores } from "./scoring";
import { createMatch } from "./state";

const VALUES: Record<string, number> = { a: 100, b: 50, c: 80 };
const valueOf = (id: string): number => VALUES[id] ?? 0;

describe("cityScore", () => {
  it("counts a held city at its full value", () => {
    expect(cityScore([{ id: "a", owner: "macedon", hp: 100 }], "macedon", valueOf)).toBe(100);
  });

  it("counts a sacked city at the reduced fraction", () => {
    const sacked: CityState = { id: "a", owner: "macedon", hp: 100, sacked: true };
    expect(cityScore([sacked], "macedon", valueOf)).toBe(
      Math.round(100 * CITY_SACKED_VALUE_FRACTION),
    );
  });

  it("ignores cities held by another faction", () => {
    expect(cityScore([{ id: "a", owner: "persia", hp: 100 }], "macedon", valueOf)).toBe(0);
  });

  it("sums the faction's held cities", () => {
    const cities: CityState[] = [
      { id: "a", owner: "macedon", hp: 100 },
      { id: "b", owner: "macedon", hp: 100 },
    ];
    expect(cityScore(cities, "macedon", valueOf)).toBe(150);
  });
});

describe("matchCityScores", () => {
  it("scores each faction in the turn order", () => {
    const base = createMatch({
      id: "m1",
      seed: 1,
      mapId: "first-slice",
      turnLimit: 20,
      units: [],
      movementOf: () => 0,
      factions: ["macedon", "persia"],
    });
    const state = {
      ...base,
      cities: [
        { id: "a", owner: "macedon", hp: 100 },
        { id: "b", owner: "persia", hp: 100, sacked: true },
      ],
    };
    expect(matchCityScores(state, valueOf)).toEqual({ macedon: 100, persia: 30 });
  });
});
