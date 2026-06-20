import { describe, it, expect } from "vitest";
import type { City } from "../map/types";
import { CITY_HP_PER_DEFENSE, cityMaxHp, seedCities } from "./cities";

const city = (id: string, owner: string | null, defense: number): City => ({
  id,
  name: id,
  hex: { q: 0, r: 0 },
  owner,
  value: 100,
  defense,
});

describe("cityMaxHp", () => {
  it("scales HP from the authored defense", () => {
    expect(cityMaxHp(24)).toBe(24 * CITY_HP_PER_DEFENSE);
  });
});

describe("seedCities", () => {
  it("seeds each city at full HP", () => {
    expect(seedCities([city("sardis", "persia", 24)])[0]?.hp).toBe(cityMaxHp(24));
  });

  it("carries the authored owner", () => {
    expect(seedCities([city("sparta", null, 26)])[0]?.owner).toBeNull();
  });

  it("returns one entry per authored city", () => {
    expect(seedCities([city("a", "macedon", 20), city("b", "persia", 18)])).toHaveLength(2);
  });
});
