import { describe, it, expect } from "vitest";
import type { Unit } from "../unit/types";
import { createMatch } from "./state";
import { InMemoryMatchStore, StaleMatchError } from "./store";

const UNIT: Unit = {
  id: "u1",
  typeId: "pezhetairos",
  owner: "macedon",
  hex: { q: 0, r: 0 },
  hp: 100,
  morale: 80,
  supplied: true,
  hasMovedThisTurn: false,
};

const make = () =>
  createMatch({ id: "m1", seed: 7, mapId: "first-slice", turnLimit: 20, units: [UNIT], movementOf: () => 4 });

describe("InMemoryMatchStore", () => {
  it("loads a match that was created", async () => {
    const store = new InMemoryMatchStore();
    await store.create(make());
    expect((await store.load("m1"))?.id).toBe("m1");
  });

  it("returns null for an unknown match", async () => {
    expect(await new InMemoryMatchStore().load("nope")).toBeNull();
  });

  it("increments the version on save", async () => {
    const store = new InMemoryMatchStore();
    const state = make();
    await store.create(state);
    expect((await store.save(state)).version).toBe(1);
  });

  it("rejects a stale write", async () => {
    const store = new InMemoryMatchStore();
    const state = make();
    await store.create(state);
    await store.save(state);
    await expect(store.save(state)).rejects.toBeInstanceOf(StaleMatchError);
  });
});
