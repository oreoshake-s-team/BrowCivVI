import type { AttackEvent, DefectionEvent, MatchEvent } from "@/engine/match/events";

export interface ReplayTiming {
  panMs: number;
  holdMs: number;
}

export interface AttackReplayDriver {
  readonly panTo: (event: AttackEvent) => void;
  readonly showHit: (event: AttackEvent) => void;
  readonly delay: (ms: number) => Promise<void>;
}

export function newAttackEvents(
  events: readonly MatchEvent[],
  sinceSeq: number,
): readonly AttackEvent[] {
  return events
    .filter((event): event is AttackEvent => event.kind === "attack" && event.seq >= sinceSeq)
    .slice()
    .sort((a, b) => a.seq - b.seq);
}

export function newDefectionEvents(
  events: readonly MatchEvent[],
  sinceSeq: number,
): readonly DefectionEvent[] {
  return events
    .filter((event): event is DefectionEvent => event.kind === "defection" && event.seq >= sinceSeq)
    .slice()
    .sort((a, b) => a.seq - b.seq);
}

export async function replayAttacks(
  events: readonly AttackEvent[],
  driver: AttackReplayDriver,
  timing: ReplayTiming,
): Promise<void> {
  for (const event of events) {
    driver.panTo(event);
    await driver.delay(timing.panMs);
    driver.showHit(event);
    await driver.delay(timing.holdMs);
  }
}
