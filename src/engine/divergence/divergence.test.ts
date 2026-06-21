import { describe, it, expect } from "vitest";
import { FIRST_SLICE_DIVERGENCE_NODES, FIRST_SLICE_UNITS } from "@/content/firstSlice";
import { createMatch, type MatchState } from "@/engine/match/state";
import { createRng } from "@/engine/rng";
import {
  applyDivergenceEffect,
  pendingDivergence,
  resolveDivergenceNode,
  seededRivalOption,
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

const macedonMorale = (state: MatchState) =>
  state.units.find((unit) => unit.id === "mac-phalanx")?.morale ?? 0;

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

  it("rejects an unknown option", () => {
    expect(resolveDivergenceNode(match(), NODE, "flee", createRng(1))).toBeNull();
  });

  it("rejects a rival-faction option chosen by the player", () => {
    expect(resolveDivergenceNode(match(), NODE, "scorched", createRng(1))).toBeNull();
  });
});
