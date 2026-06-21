import { describe, it, expect } from "vitest";
import {
  FIRST_SLICE_CITIES,
  FIRST_SLICE_DIVERGENCE_NODES,
  FIRST_SLICE_MAP,
  FIRST_SLICE_UNITS,
  SCORCHED_SATRAPIES,
} from "@/content/firstSlice";
import { createMatch, type MatchState } from "@/engine/match/state";
import { createRng } from "@/engine/rng";
import {
  applyDivergenceEffect,
  pendingDivergence,
  resolveDivergenceNode,
  SCORCHED_LOYALTY_DRIFT,
  seededRivalOption,
  type ScorchEffect,
} from "./divergence";

const NODE = FIRST_SLICE_DIVERGENCE_NODES[0]!;

function match(): MatchState {
  return createMatch({
    id: "m1",
    seed: 1,
    mapId: "first-slice",
    turnLimit: 20,
    units: FIRST_SLICE_UNITS,
    movementOf: () => 4,
  });
}

function matchWithCities(): MatchState {
  return createMatch({
    id: "m1",
    seed: 1,
    mapId: "first-slice",
    turnLimit: 20,
    units: FIRST_SLICE_UNITS,
    movementOf: () => 4,
    cities: FIRST_SLICE_CITIES,
  });
}

const SCORCH: ScorchEffect = { kind: "scorch", faction: "persia", hexes: SCORCHED_SATRAPIES };
const MAP_CTX = { map: FIRST_SLICE_MAP };
const loyaltyOf = (state: MatchState, id: string) =>
  state.cities.find((city) => city.id === id)?.loyalty ?? 0;

const macedonMorale = (state: MatchState) =>
  state.units.find((unit) => unit.id === "mac-phalanx")?.morale ?? 0;

function seedFor(optionId: string): number {
  for (let seed = 0; seed < 200; seed++) {
    if (seededRivalOption(NODE, createRng(seed))?.id === optionId) return seed;
  }
  throw new Error(`no seed rolled the ${optionId} rival option`);
}

describe("applyDivergenceEffect", () => {
  it("adjusts morale for the targeted faction", () => {
    const before = macedonMorale(match());
    const after = macedonMorale(
      applyDivergenceEffect(match(), { kind: "morale", faction: "macedon", delta: 5 }),
    );
    expect(after - before).toBe(5);
  });

  it("leaves other factions' morale untouched", () => {
    const next = applyDivergenceEffect(match(), { kind: "morale", faction: "macedon", delta: 5 });
    expect(next.units.find((unit) => unit.id === "per-cavalry")?.morale).toBe(
      match().units.find((unit) => unit.id === "per-cavalry")?.morale,
    );
  });

  it("clamps morale at 100", () => {
    const next = applyDivergenceEffect(match(), { kind: "morale", faction: "macedon", delta: 50 });
    expect(macedonMorale(next)).toBe(100);
  });

  it("sets a faction's remaining movement", () => {
    const next = applyDivergenceEffect(match(), {
      kind: "movement",
      faction: "macedon",
      remaining: 0,
    });
    expect(next.movement["mac-phalanx"]).toBe(0);
  });

  it("leaves another faction's movement untouched", () => {
    const next = applyDivergenceEffect(match(), {
      kind: "movement",
      faction: "macedon",
      remaining: 0,
    });
    expect(next.movement["per-cavalry"]).toBe(4);
  });

  it("wounds a targeted unit", () => {
    const next = applyDivergenceEffect(match(), {
      kind: "hp",
      unitId: "mac-companions",
      delta: -40,
    });
    expect(next.units.find((unit) => unit.id === "mac-companions")?.hp).toBe(60);
  });

  it("never reduces a wounded unit below one hit point", () => {
    const next = applyDivergenceEffect(match(), {
      kind: "hp",
      unitId: "mac-companions",
      delta: -500,
    });
    expect(next.units.find((unit) => unit.id === "mac-companions")?.hp).toBe(1);
  });

  it("records burned hexes from a scorch effect", () => {
    const next = applyDivergenceEffect(match(), {
      kind: "scorch",
      faction: "persia",
      hexes: ["7,2", "8,2"],
    });
    expect(next.scorched).toEqual(["7,2", "8,2"]);
  });

  it("does not re-record an already-burned hex", () => {
    const once = applyDivergenceEffect(match(), {
      kind: "scorch",
      faction: "persia",
      hexes: ["7,2"],
    });
    const twice = applyDivergenceEffect(once, {
      kind: "scorch",
      faction: "persia",
      hexes: ["7,2", "8,2"],
    });
    expect(twice.scorched).toEqual(["7,2", "8,2"]);
  });

  it("erodes a scorched satrapy's loyalty toward the enemy of the burner", () => {
    const before = matchWithCities();
    const after = applyDivergenceEffect(before, SCORCH, MAP_CTX);
    expect(loyaltyOf(after, "dascylium") - loyaltyOf(before, "dascylium")).toBe(
      SCORCHED_LOYALTY_DRIFT,
    );
  });

  it("leaves cities outside the scorched region untouched", () => {
    const before = matchWithCities();
    const after = applyDivergenceEffect(before, SCORCH, MAP_CTX);
    expect(loyaltyOf(after, "pella")).toBe(loyaltyOf(before, "pella"));
  });

  it("skips the loyalty cost when no map context is supplied", () => {
    const before = matchWithCities();
    const after = applyDivergenceEffect(before, SCORCH);
    expect(loyaltyOf(after, "dascylium")).toBe(loyaltyOf(before, "dascylium"));
  });
});

describe("pendingDivergence", () => {
  it("surfaces the Granicus node on the player's first turn", () => {
    expect(pendingDivergence(match(), FIRST_SLICE_DIVERGENCE_NODES)?.id).toBe("granicus");
  });

  it("is clear once the node is resolved", () => {
    const resolved = resolveDivergenceNode(match(), NODE, "reckless", createRng(1));
    expect(pendingDivergence(resolved!.state, FIRST_SLICE_DIVERGENCE_NODES)).toBeNull();
  });
});

describe("seededRivalOption", () => {
  it("is deterministic for a given seed", () => {
    expect(seededRivalOption(NODE, createRng(7))?.id).toBe(
      seededRivalOption(NODE, createRng(7))?.id,
    );
  });

  it("can reach both of Persia's options across seeds", () => {
    const ids = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      const option = seededRivalOption(NODE, createRng(seed));
      if (option !== null) ids.add(option.id);
    }
    expect(ids).toEqual(new Set(["pitched", "scorched"]));
  });
});

describe("resolveDivergenceNode", () => {
  it("records the player's choice and a seeded rival outcome", () => {
    const resolved = resolveDivergenceNode(match(), NODE, "reckless", createRng(1));
    expect(resolved?.record.choice).toBe("reckless");
  });

  it("applies the chosen option's morale effect", () => {
    const resolved = resolveDivergenceNode(match(), NODE, "reckless", createRng(1));
    expect(macedonMorale(resolved!.state) - macedonMorale(match())).toBe(8);
  });

  it("forfeits the turn's movement on the cautious choice", () => {
    const resolved = resolveDivergenceNode(match(), NODE, "cautious", createRng(1));
    expect(resolved!.state.movement["mac-phalanx"]).toBe(0);
  });

  it("wounds the Companions on the reckless choice", () => {
    const resolved = resolveDivergenceNode(match(), NODE, "reckless", createRng(1));
    expect(resolved!.state.units.find((unit) => unit.id === "mac-companions")?.hp).toBe(60);
  });

  it("rejects an unknown option", () => {
    expect(resolveDivergenceNode(match(), NODE, "flee", createRng(1))).toBeNull();
  });

  it("rejects a rival-faction option chosen by the player", () => {
    expect(resolveDivergenceNode(match(), NODE, "scorched", createRng(1))).toBeNull();
  });

  it("burns the satrapies when the rival commits to scorched earth", () => {
    const resolved = resolveDivergenceNode(
      match(),
      NODE,
      "reckless",
      createRng(seedFor("scorched")),
    );
    expect(resolved!.state.scorched).toEqual([...SCORCHED_SATRAPIES]);
  });

  it("leaves the land unburned when the rival gives pitched battle", () => {
    const resolved = resolveDivergenceNode(
      match(),
      NODE,
      "reckless",
      createRng(seedFor("pitched")),
    );
    expect(resolved!.state.scorched).toEqual([]);
  });

  it("erodes satrapy loyalty when the rival commits to scorched earth", () => {
    const before = matchWithCities();
    const resolved = resolveDivergenceNode(
      before,
      NODE,
      "reckless",
      createRng(seedFor("scorched")),
      MAP_CTX,
    );
    expect(loyaltyOf(resolved!.state, "dascylium") - loyaltyOf(before, "dascylium")).toBe(
      SCORCHED_LOYALTY_DRIFT,
    );
  });

  it("leaves satrapy loyalty intact when the rival gives pitched battle", () => {
    const before = matchWithCities();
    const resolved = resolveDivergenceNode(
      before,
      NODE,
      "reckless",
      createRng(seedFor("pitched")),
      MAP_CTX,
    );
    expect(loyaltyOf(resolved!.state, "dascylium")).toBe(loyaltyOf(before, "dascylium"));
  });
});
