import type { Prisma, PrismaClient } from "@prisma/client";
import { describe, it, expect } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import { createMatch } from "@/engine/match/state";
import { StaleMatchError } from "@/engine/match/store";
import type { Unit } from "@/engine/unit/types";
import { PrismaMatchStore } from "./prismaMatchStore";

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

const STATE = createMatch({
  id: "m1",
  seed: 7,
  mapId: "first-slice",
  turnLimit: 20,
  units: [UNIT],
  movementOf: () => 4,
});

function storeWith() {
  const prisma = mockDeep<PrismaClient>();
  return { prisma, store: new PrismaMatchStore(prisma) };
}

function storedRow(version: number) {
  return {
    id: STATE.id,
    owner: STATE.owner,
    version,
    schemaVersion: STATE.schemaVersion,
    state: STATE as unknown as Prisma.JsonValue,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

describe("PrismaMatchStore", () => {
  it("loads and decodes a stored match", async () => {
    const { prisma, store } = storeWith();
    prisma.match.findUnique.mockResolvedValue(storedRow(5));
    expect((await store.load("m1"))?.id).toBe("m1");
  });

  it("uses the authoritative column version on load", async () => {
    const { prisma, store } = storeWith();
    prisma.match.findUnique.mockResolvedValue(storedRow(5));
    expect((await store.load("m1"))?.version).toBe(5);
  });

  it("returns null when the match is absent", async () => {
    const { prisma, store } = storeWith();
    prisma.match.findUnique.mockResolvedValue(null);
    expect(await store.load("nope")).toBeNull();
  });

  it("bumps the version on a successful save", async () => {
    const { prisma, store } = storeWith();
    prisma.match.updateMany.mockResolvedValue({ count: 1 });
    expect((await store.save(STATE)).version).toBe(1);
  });

  it("rejects a stale save when no row matches the version", async () => {
    const { prisma, store } = storeWith();
    prisma.match.updateMany.mockResolvedValue({ count: 0 });
    await expect(store.save(STATE)).rejects.toBeInstanceOf(StaleMatchError);
  });

  it("inserts a row on create", async () => {
    const { prisma, store } = storeWith();
    await store.create(STATE);
    expect(prisma.match.create).toHaveBeenCalledOnce();
  });
});
