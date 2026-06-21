import { describe, it, expect } from "vitest";
import type { MatchState } from "@/engine/match/state";
import { InMemoryMatchStore } from "@/engine/match/store";
import {
  backfillCities,
  getOrCreateDefault,
  createNewMatch,
  loadOwned,
  newMatchState,
} from "./matchService";

function legacyMatchWithoutCities(id: string, owner: string): MatchState {
  return { ...newMatchState(id, owner), cities: [] };
}

describe("getOrCreateDefault", () => {
  it("creates a default match owned by a new visitor", async () => {
    const store = new InMemoryMatchStore();
    expect((await getOrCreateDefault(store, "owner-1")).owner).toBe("owner-1");
  });

  it("returns the same default match on a second visit", async () => {
    const store = new InMemoryMatchStore();
    const first = await getOrCreateDefault(store, "owner-1");
    const second = await getOrCreateDefault(store, "owner-1");
    expect(second.id).toBe(first.id);
  });
});

describe("createNewMatch", () => {
  it("gives each new game a distinct id", async () => {
    const store = new InMemoryMatchStore();
    const first = await createNewMatch(store, "owner-1");
    const second = await createNewMatch(store, "owner-1");
    expect(second.id).not.toBe(first.id);
  });
});

describe("loadOwned", () => {
  it("loads a match owned by the visitor", async () => {
    const store = new InMemoryMatchStore();
    const created = await createNewMatch(store, "owner-1");
    expect((await loadOwned(store, "owner-1", created.id))?.id).toBe(created.id);
  });

  it("refuses a match owned by someone else", async () => {
    const store = new InMemoryMatchStore();
    const created = await createNewMatch(store, "owner-1");
    expect(await loadOwned(store, "intruder", created.id)).toBeNull();
  });
});

describe("newMatchState", () => {
  it("seeds the authored first-slice units", () => {
    expect(newMatchState("m1", "owner-1").units.length).toBeGreaterThan(0);
  });

  it("seeds city state from the authored first-slice cities", () => {
    expect(newMatchState("m1", "owner-1").cities.length).toBeGreaterThan(0);
  });

  it("seeds Sardis under Persian control at full HP", () => {
    const sardis = newMatchState("m1", "owner-1").cities.find((city) => city.id === "sardis");
    expect(sardis?.owner).toBe("persia");
  });
});

describe("backfillCities", () => {
  it("seeds city state for a legacy match saved without any cities", () => {
    const backfilled = backfillCities(legacyMatchWithoutCities("m1", "owner-1"));
    expect(backfilled.cities.length).toBeGreaterThan(0);
  });

  it("keeps Persian-held cities under Persian control when backfilling", () => {
    const backfilled = backfillCities(legacyMatchWithoutCities("m1", "owner-1"));
    expect(backfilled.cities.find((city) => city.id === "sardis")?.owner).toBe("persia");
  });

  it("leaves an existing match with city state untouched", () => {
    const match = newMatchState("m1", "owner-1");
    expect(backfillCities(match).cities).toBe(match.cities);
  });

  it("leaves cities empty for an unknown map", () => {
    const match: MatchState = { ...legacyMatchWithoutCities("m1", "owner-1"), mapId: "unknown" };
    expect(backfillCities(match).cities).toEqual([]);
  });
});

describe("loadOwned backfills legacy city state", () => {
  it("returns seeded cities for a match persisted before city state existed", async () => {
    const store = new InMemoryMatchStore();
    const legacy = legacyMatchWithoutCities("legacy-1", "owner-1");
    await store.create(legacy);
    const loaded = await loadOwned(store, "owner-1", "legacy-1");
    expect(loaded?.cities.length).toBeGreaterThan(0);
  });
});
