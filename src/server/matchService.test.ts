import { describe, it, expect } from "vitest";
import { InMemoryMatchStore } from "@/engine/match/store";
import {
  getOrCreateDefault,
  createNewMatch,
  deleteOldMatches,
  listOwnedSummaries,
  loadOwned,
  newMatchState,
} from "./matchService";

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

describe("listOwnedSummaries", () => {
  it("summarises a match with its turn progress", async () => {
    const store = new InMemoryMatchStore();
    const created = await createNewMatch(store, "owner-1");
    const summary = (await listOwnedSummaries(store, "owner-1"))[0]!;
    expect(summary.turnLimit).toBe(created.turnLimit);
  });

  it("scores the player's held cities from the authored values", async () => {
    const store = new InMemoryMatchStore();
    await createNewMatch(store, "owner-1");
    expect((await listOwnedSummaries(store, "owner-1"))[0]!.score).toBeGreaterThan(0);
  });

  it("orders games newest-played first", async () => {
    const store = new InMemoryMatchStore();
    const first = await createNewMatch(store, "owner-1");
    const second = await createNewMatch(store, "owner-1");
    const ids = (await listOwnedSummaries(store, "owner-1")).map((summary) => summary.id);
    expect(ids).toEqual([second.id, first.id]);
  });

  it("omits games owned by another visitor", async () => {
    const store = new InMemoryMatchStore();
    await createNewMatch(store, "owner-1");
    await createNewMatch(store, "intruder");
    expect((await listOwnedSummaries(store, "owner-1")).length).toBe(1);
  });
});

describe("deleteOldMatches", () => {
  it("keeps the most recently played game and removes the rest", async () => {
    const store = new InMemoryMatchStore();
    await createNewMatch(store, "owner-1");
    const recent = await createNewMatch(store, "owner-1");
    await deleteOldMatches(store, "owner-1");
    expect((await listOwnedSummaries(store, "owner-1")).map((s) => s.id)).toEqual([recent.id]);
  });

  it("reports how many old games it deleted", async () => {
    const store = new InMemoryMatchStore();
    await createNewMatch(store, "owner-1");
    await createNewMatch(store, "owner-1");
    await createNewMatch(store, "owner-1");
    expect(await deleteOldMatches(store, "owner-1")).toBe(2);
  });

  it("deletes nothing when only one game exists", async () => {
    const store = new InMemoryMatchStore();
    await createNewMatch(store, "owner-1");
    expect(await deleteOldMatches(store, "owner-1")).toBe(0);
  });

  it("deletes nothing when there are no games", async () => {
    expect(await deleteOldMatches(new InMemoryMatchStore(), "owner-1")).toBe(0);
  });

  it("leaves another visitor's games untouched", async () => {
    const store = new InMemoryMatchStore();
    await createNewMatch(store, "owner-1");
    await createNewMatch(store, "owner-1");
    await createNewMatch(store, "intruder");
    await deleteOldMatches(store, "owner-1");
    expect((await listOwnedSummaries(store, "intruder")).length).toBe(1);
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
