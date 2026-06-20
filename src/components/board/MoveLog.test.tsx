// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import type { AttackEvent, MatchEvent, MoveEvent } from "@/engine/match/events";
import { MoveLog } from "./MoveLog";

afterEach(cleanup);

const moveEvent = (seq: number, faction: string): MoveEvent => ({
  kind: "move",
  seq,
  turn: 1,
  faction,
  unitId: "u1",
  unitTypeId: "pezhetairos",
  from: { q: 5, r: 1 },
  to: { q: 5, r: 0 },
});

const attackEvent = (seq: number, defeated: boolean): AttackEvent => ({
  kind: "attack",
  seq,
  turn: 2,
  faction: "persia",
  unitId: "p1",
  unitTypeId: "persian-cavalry",
  targetId: "m1",
  targetTypeId: "pezhetairos",
  targetHex: { q: 6, r: 1 },
  attackerDamage: 12,
  defenderDamage: 40,
  defeated: defeated ? ["m1"] : [],
});

describe("MoveLog", () => {
  it("shows an empty state when there are no events", () => {
    render(<MoveLog events={[]} />);
    expect(screen.getByText(/No actions yet/)).not.toBeNull();
  });

  it("renders a move entry with the unit name and endpoints", () => {
    render(<MoveLog events={[moveEvent(0, "macedon")]} />);
    expect(screen.getByText(/moved \(5, 1\) → \(5, 0\)/)).not.toBeNull();
  });

  it("renders an attack entry with the target and damage", () => {
    render(<MoveLog events={[attackEvent(0, false)]} />);
    expect(screen.getByText(/attacked Persian Cavalry|dealt 40, took 12/)).not.toBeNull();
  });

  it("marks a defeated target", () => {
    render(<MoveLog events={[attackEvent(0, true)]} />);
    expect(screen.getByText("(defeated)")).not.toBeNull();
  });

  it("color-codes the acting unit by faction", () => {
    render(<MoveLog events={[moveEvent(0, "persia")]} />);
    expect(screen.getByText("Pezhetairos").getAttribute("data-faction")).toBe("persia");
  });

  it("renders entries in chronological order", () => {
    const events: readonly MatchEvent[] = [moveEvent(0, "macedon"), attackEvent(1, false)];
    render(<MoveLog events={events} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]?.textContent).toContain("moved");
  });

  it("labels the panel as a log region for assistive tech", () => {
    render(<MoveLog events={[]} />);
    expect(screen.getByRole("region", { name: "Move and attack log" })).not.toBeNull();
  });
});
