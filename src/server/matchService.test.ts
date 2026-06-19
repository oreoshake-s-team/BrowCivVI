import { describe, it, expect } from "vitest";
import { InMemoryMatchStore } from "@/engine/match/store";
import { getOrCreateMatch, newMatchState } from "./matchService";

describe("getOrCreateMatch", () => {
  it("creates a match owned by a new visitor", async () => {
    const store = new InMemoryMatchStore();
    expect((await getOrCreateMatch(store, "owner-1")).owner).toBe("owner-1");
  });

  it("returns the existing match on a second visit", async () => {
    const store = new InMemoryMatchStore();
    const first = await getOrCreateMatch(store, "owner-1");
    const second = await getOrCreateMatch(store, "owner-1");
    expect(second.id).toBe(first.id);
  });
});

describe("newMatchState", () => {
  it("seeds the authored first-slice units", () => {
    expect(newMatchState("owner-1").units.length).toBeGreaterThan(0);
  });
});
