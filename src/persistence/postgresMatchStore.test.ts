import { describe, it, expect } from "vitest";
import type { Unit } from "@/engine/unit/types";
import { createMatch } from "@/engine/match/state";
import { StaleMatchError } from "@/engine/match/store";
import type { SqlExecutor, SqlRow } from "./sql";
import { PostgresMatchStore } from "./postgresMatchStore";

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

const STATE = createMatch({ id: "m1", seed: 7, mapId: "first-slice", turnLimit: 20, units: [UNIT], movementOf: () => 4 });

function fakeExec(responses: readonly SqlRow[][]) {
  const calls: { text: string; params: readonly unknown[] }[] = [];
  let index = 0;
  const exec: SqlExecutor = async (text, params) => {
    calls.push({ text, params });
    const rows = responses[index] ?? [];
    index += 1;
    return rows;
  };
  return { exec, calls };
}

describe("PostgresMatchStore", () => {
  it("loads and upcasts a stored match", async () => {
    const { exec } = fakeExec([[{ state: STATE, version: 5 }]]);
    expect((await new PostgresMatchStore(exec).load("m1"))?.id).toBe("m1");
  });

  it("uses the authoritative column version on load", async () => {
    const { exec } = fakeExec([[{ state: STATE, version: 5 }]]);
    expect((await new PostgresMatchStore(exec).load("m1"))?.version).toBe(5);
  });

  it("returns null when the match is absent", async () => {
    const { exec } = fakeExec([[]]);
    expect(await new PostgresMatchStore(exec).load("nope")).toBeNull();
  });

  it("bumps the version on a successful save", async () => {
    const { exec } = fakeExec([[{ version: 1 }]]);
    expect((await new PostgresMatchStore(exec).save(STATE)).version).toBe(1);
  });

  it("rejects a stale save when no row matches the version", async () => {
    const { exec } = fakeExec([[]]);
    await expect(new PostgresMatchStore(exec).save(STATE)).rejects.toBeInstanceOf(StaleMatchError);
  });

  it("inserts a row on create", async () => {
    const { exec, calls } = fakeExec([[]]);
    await new PostgresMatchStore(exec).create(STATE);
    expect(calls[0]?.text).toContain("INSERT INTO matches");
  });
});
