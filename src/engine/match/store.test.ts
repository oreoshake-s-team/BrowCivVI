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

const make = (id = "m1", owner: string | null = null) =>
  createMatch({
    id,
    owner,
    seed: 7,
    mapId: "first-slice",
    turnLimit: 20,
    units: [UNIT],
    movementOf: () => 4,
  });

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

describe("InMemoryMatchStore listByOwner", () => {
  it("returns every match owned by the visitor", async () => {
    const store = new InMemoryMatchStore();
    await store.create(make("a", "owner-1"));
    await store.create(make("b", "owner-1"));
    expect((await store.listByOwner("owner-1")).length).toBe(2);
  });

  it("excludes matches owned by someone else", async () => {
    const store = new InMemoryMatchStore();
    await store.create(make("a", "owner-1"));
    await store.create(make("b", "owner-2"));
    const ids = (await store.listByOwner("owner-1")).map((m) => m.state.id);
    expect(ids).toEqual(["a"]);
  });

  it("advances updatedAt when a match is saved", async () => {
    const store = new InMemoryMatchStore();
    const state = make("a", "owner-1");
    await store.create(state);
    const before = (await store.listByOwner("owner-1"))[0]!.updatedAt;
    await store.save(state);
    expect((await store.listByOwner("owner-1"))[0]!.updatedAt).toBeGreaterThan(before);
  });
});
