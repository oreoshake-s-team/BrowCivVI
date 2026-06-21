import { describe, it, expect } from "vitest";
import { createGameMap, hexKey, type City } from "../map/types";
import {
  blockingCityHexes,
  captureCityAt,
  CITY_HP_PER_DEFENSE,
  cityMaxHp,
  seedCities,
  type CityState,
} from "./cities";

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

const CITY_HEX = { q: 0, r: 0 };
const CAPTURE_MAP = createGameMap(
  [{ hex: CITY_HEX, terrain: "plains", cityId: "sardis" }],
  [city("sardis", "persia", 24)],
);
const fallen: CityState = { id: "sardis", owner: "persia", hp: 0 };

describe("captureCityAt", () => {
  it("flips the owner of a fallen enemy city to the capturer", () => {
    const result = captureCityAt([fallen], CAPTURE_MAP, CITY_HEX, "macedon");
    expect(result.cities[0]?.owner).toBe("macedon");
  });

  it("resets the captured city's HP above 0", () => {
    const result = captureCityAt([fallen], CAPTURE_MAP, CITY_HEX, "macedon");
    expect(result.cities[0]?.hp).toBeGreaterThan(0);
  });

  it("reports the previous owner", () => {
    const result = captureCityAt([fallen], CAPTURE_MAP, CITY_HEX, "macedon");
    expect(result.captured?.previousOwner).toBe("persia");
  });

  it("does not capture a city that still has HP", () => {
    const result = captureCityAt(
      [{ id: "sardis", owner: "persia", hp: 50 }],
      CAPTURE_MAP,
      CITY_HEX,
      "macedon",
    );
    expect(result.captured).toBeNull();
  });

  it("does not capture your own fallen city", () => {
    const result = captureCityAt(
      [{ id: "sardis", owner: "macedon", hp: 0 }],
      CAPTURE_MAP,
      CITY_HEX,
      "macedon",
    );
    expect(result.captured).toBeNull();
  });

  it("does nothing on a hex with no city", () => {
    expect(captureCityAt([fallen], CAPTURE_MAP, { q: 5, r: 5 }, "macedon").captured).toBeNull();
  });
});

describe("blockingCityHexes", () => {
  it("blocks an enemy city that still has HP", () => {
    const blocks = blockingCityHexes(
      [{ id: "sardis", owner: "persia", hp: 50 }],
      CAPTURE_MAP,
      "macedon",
    );
    expect(blocks.has(hexKey(CITY_HEX))).toBe(true);
  });

  it("does not block a fallen enemy city", () => {
    expect(blockingCityHexes([fallen], CAPTURE_MAP, "macedon").size).toBe(0);
  });

  it("does not block your own city", () => {
    const blocks = blockingCityHexes(
      [{ id: "sardis", owner: "macedon", hp: 50 }],
      CAPTURE_MAP,
      "macedon",
    );
    expect(blocks.size).toBe(0);
  });
});
