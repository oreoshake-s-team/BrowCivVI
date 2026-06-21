import { describe, it, expect, vi } from "vitest";
import type { Hex } from "@/engine/hex";
import type { AttackEvent, MatchEvent } from "@/engine/match/events";
import {
  newAttackEvents,
  newDefectionEvents,
  replayAttacks,
  type AttackReplayDriver,
} from "./replayAttacks";

function move(seq: number): MatchEvent {
  return {
    kind: "move",
    seq,
    turn: 2,
    faction: "persia",
    unitId: `p${seq}`,
    unitTypeId: "persian-cavalry",
    from: { q: 0, r: 0 },
    to: { q: 1, r: 0 },
  };
}

function attackAt(seq: number, attackerHex: Hex): AttackEvent {
  return {
    kind: "attack",
    seq,
    turn: 2,
    faction: "persia",
    unitId: `p${seq}`,
    unitTypeId: "persian-cavalry",
    attackerHex,
    targetId: "m1",
    targetTypeId: "pezhetairos",
    targetHex: { q: 6, r: 1 },
    attackerDamage: 10,
    defenderDamage: 30,
    defeated: [],
  };
}

const NO_TIMING = { panMs: 0, holdMs: 0 };

function recordingDriver(log: string[]): AttackReplayDriver {
  return {
    panTo: (event) => log.push(`pan:${event.seq}`),
    showHit: (event) => log.push(`hit:${event.seq}`),
    delay: () => Promise.resolve(),
  };
}

describe("newAttackEvents", () => {
  it("keeps only attack events newer than the cutoff sequence", () => {
    const events: MatchEvent[] = [
      attackAt(0, { q: 1, r: 0 }),
      move(1),
      attackAt(2, { q: 2, r: 0 }),
    ];
    expect(newAttackEvents(events, 1).map((event) => event.seq)).toEqual([2]);
  });

  it("orders the replayed attacks by sequence", () => {
    const events: MatchEvent[] = [attackAt(3, { q: 3, r: 0 }), attackAt(1, { q: 1, r: 0 })];
    expect(newAttackEvents(events, 0).map((event) => event.seq)).toEqual([1, 3]);
  });
});

describe("replayAttacks", () => {
  it("pans then hits each attack in order", async () => {
    const log: string[] = [];
    await replayAttacks(
      [attackAt(1, { q: 1, r: 0 }), attackAt(2, { q: 2, r: 0 })],
      recordingDriver(log),
      NO_TIMING,
    );
    expect(log).toEqual(["pan:1", "hit:1", "pan:2", "hit:2"]);
  });

  it("pans the camera to each attacker's own hex", async () => {
    const panned: Hex[] = [];
    const driver: AttackReplayDriver = {
      panTo: (event) => panned.push(event.attackerHex),
      showHit: () => undefined,
      delay: () => Promise.resolve(),
    };
    await replayAttacks(
      [attackAt(1, { q: 4, r: 1 }), attackAt(2, { q: 5, r: 2 })],
      driver,
      NO_TIMING,
    );
    expect(panned).toEqual([
      { q: 4, r: 1 },
      { q: 5, r: 2 },
    ]);
  });

  it("does nothing when there are no attacks to replay", async () => {
    const driver: AttackReplayDriver = {
      panTo: vi.fn(),
      showHit: vi.fn(),
      delay: vi.fn(() => Promise.resolve()),
    };
    await replayAttacks([], driver, NO_TIMING);
    expect(driver.panTo).not.toHaveBeenCalled();
  });
});

function defectionAt(seq: number): MatchEvent {
  return {
    kind: "defection",
    seq,
    turn: 3,
    faction: "macedon",
    cityId: `c${seq}`,
    hex: { q: seq, r: 0 },
    previousOwner: "persia",
  };
}

describe("newDefectionEvents", () => {
  it("keeps only defection events newer than the cutoff sequence", () => {
    const events: MatchEvent[] = [defectionAt(0), move(1), defectionAt(2)];
    expect(newDefectionEvents(events, 1).map((event) => event.seq)).toEqual([2]);
  });

  it("ignores non-defection events", () => {
    const events: MatchEvent[] = [attackAt(0, { q: 1, r: 0 }), move(1)];
    expect(newDefectionEvents(events, 0)).toHaveLength(0);
  });
});
