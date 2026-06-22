import { describe, it, expect } from "vitest";
import { createGameMap, hexKey, type City } from "../map/types";
import {
  absorbCityDamage,
  blockingCityHexes,
  canCityStrike,
  captureCityAt,
  CITY_HEAL_RATE,
  CITY_HP_PER_DEFENSE,
  cityMaxHp,
  clampLoyalty,
  healCities,
  LOYALTY_AFFINITY_SEED,
  LOYALTY_MAX,
  LOYALTY_MIN,
  LOYALTY_OWNER_SEED,
  seedCities,
  WALL_MAX_HP,
  wallMaxHp,
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

describe("canCityStrike", () => {
  it("lets a walled city with standing walls strike", () => {
    expect(canCityStrike({ id: "c", owner: "persia", hp: 160, wallHp: 100 })).toBe(true);
  });

  it("denies a city whose walls are breached", () => {
    expect(canCityStrike({ id: "c", owner: "persia", hp: 160, wallHp: 0 })).toBe(false);
  });

  it("denies an unwalled city", () => {
    expect(canCityStrike({ id: "c", owner: "persia", hp: 160 })).toBe(false);
  });

  it("denies a city that has already struck this turn", () => {
    expect(
      canCityStrike({ id: "c", owner: "persia", hp: 160, wallHp: 100, struckThisTurn: true }),
    ).toBe(false);
  });
});

describe("healCities wall-strike reset", () => {
  it("clears the spent strike flag for the owner's incoming turn", () => {
    const reset = healCities(
      [{ id: "sardis", owner: "persia", hp: cityMaxHp(24), wallHp: 100, struckThisTurn: true }],
      "persia",
      () => cityMaxHp(24),
    );
    expect(reset[0]?.struckThisTurn).toBe(false);
  });
});

const walled = (id: string, owner: string | null, defense: number): City => ({
  ...city(id, owner, defense),
  walls: true,
});

describe("wallMaxHp", () => {
  it("gives a walled city the full wall track", () => {
    expect(wallMaxHp(walled("sardis", "persia", 24))).toBe(WALL_MAX_HP);
  });

  it("gives an unwalled city no walls", () => {
    expect(wallMaxHp(city("sparta", null, 26))).toBe(0);
  });
});

describe("absorbCityDamage", () => {
  it("spends standing wall HP before city HP", () => {
    expect(absorbCityDamage(40, 200, 25).wallHp).toBe(15);
  });

  it("leaves city HP intact while the walls stand", () => {
    expect(absorbCityDamage(40, 200, 25).hp).toBe(200);
  });

  it("clamps depleted walls at 0 rather than going negative", () => {
    expect(absorbCityDamage(10, 200, 25).wallHp).toBe(0);
  });

  it("hits city HP once the walls are gone", () => {
    expect(absorbCityDamage(0, 200, 25).hp).toBe(175);
  });
});

describe("seedCities", () => {
  it("seeds each city at full HP", () => {
    expect(seedCities([city("sardis", "persia", 24)])[0]?.hp).toBe(cityMaxHp(24));
  });

  it("seeds a walled city at full wall HP", () => {
    expect(seedCities([walled("sardis", "persia", 24)])[0]?.wallHp).toBe(WALL_MAX_HP);
  });

  it("gives an unwalled city no wall HP", () => {
    expect(seedCities([city("sparta", null, 26)])[0]?.wallHp).toBeUndefined();
  });

  it("carries the authored owner", () => {
    expect(seedCities([city("sparta", null, 26)])[0]?.owner).toBeNull();
  });

  it("returns one entry per authored city", () => {
    expect(seedCities([city("a", "macedon", 20), city("b", "persia", 18)])).toHaveLength(2);
  });

  it("seeds loyalty positive for a Macedon-owned city", () => {
    expect(seedCities([city("amphipolis", "macedon", 20)])[0]?.loyalty).toBe(LOYALTY_OWNER_SEED);
  });

  it("seeds loyalty negative for a Persia-owned city", () => {
    expect(seedCities([city("sardis", "persia", 20)])[0]?.loyalty).toBe(-LOYALTY_OWNER_SEED);
  });

  it("seeds neutral, unowned land at zero loyalty", () => {
    expect(seedCities([city("sparta", null, 20)])[0]?.loyalty).toBe(0);
  });

  it("adds the authored affinity to the owner pull", () => {
    const contested: City = { ...city("ilium", null, 20), affinity: "macedon" };
    expect(seedCities([contested])[0]?.loyalty).toBe(LOYALTY_AFFINITY_SEED);
  });
});

describe("clampLoyalty", () => {
  it("clamps above the maximum", () => {
    expect(clampLoyalty(LOYALTY_MAX + 40)).toBe(LOYALTY_MAX);
  });

  it("clamps below the minimum", () => {
    expect(clampLoyalty(LOYALTY_MIN - 40)).toBe(LOYALTY_MIN);
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

  it("marks a force-captured city as sacked", () => {
    const result = captureCityAt([fallen], CAPTURE_MAP, CITY_HEX, "macedon");
    expect(result.cities[0]?.sacked).toBe(true);
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

describe("healCities", () => {
  const max = () => 100;

  it("heals an un-attacked faction city by the heal rate", () => {
    const healed = healCities([{ id: "s", owner: "macedon", hp: 50 }], "macedon", max);
    expect(healed[0]?.hp).toBe(50 + CITY_HEAL_RATE);
  });

  it("caps healing at the city's max HP", () => {
    const healed = healCities([{ id: "s", owner: "macedon", hp: 95 }], "macedon", max);
    expect(healed[0]?.hp).toBe(100);
  });

  it("does not heal a city attacked this turn but clears its flag", () => {
    const healed = healCities(
      [{ id: "s", owner: "macedon", hp: 50, attackedThisTurn: true }],
      "macedon",
      max,
    );
    expect([healed[0]?.hp, healed[0]?.attackedThisTurn]).toEqual([50, false]);
  });

  it("leaves another faction's city untouched", () => {
    const healed = healCities([{ id: "s", owner: "persia", hp: 50 }], "macedon", max);
    expect(healed[0]?.hp).toBe(50);
  });
});
