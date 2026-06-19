import { describe, it, expect } from "vitest";
import { InMemoryMatchStore } from "@/engine/match/store";
import { getOrCreateDefault, createNewMatch, loadOwned, newMatchState } from "./matchService";

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
});
