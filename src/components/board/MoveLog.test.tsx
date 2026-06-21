// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import type {
  AttackEvent,
  CaptureEvent,
  CityAttackEvent,
  DefectionEvent,
  MatchEvent,
  MoveEvent,
} from "@/engine/match/events";
import { MoveLog } from "./MoveLog";

afterEach(cleanup);

const CITY_NAMES: ReadonlyMap<string, string> = new Map([["sardis", "Sardis"]]);

const cityAttackEvent = (seq: number, cityFell: boolean): CityAttackEvent => ({
  kind: "cityAttack",
  seq,
  turn: 4,
  faction: "macedon",
  unitId: "m1",
  unitTypeId: "pezhetairos",
  cityId: "sardis",
  cityDamage: 30,
  retaliation: 8,
  cityFell,
});

const captureEvent = (seq: number): CaptureEvent => ({
  kind: "capture",
  seq,
  turn: 5,
  faction: "macedon",
  unitId: "m1",
  unitTypeId: "pezhetairos",
  cityId: "sardis",
  previousOwner: "persia",
});

const defectionEvent = (
  seq: number,
  faction: string,
  previousOwner: string | null,
): DefectionEvent => ({
  kind: "defection",
  seq,
  turn: 6,
  faction,
  cityId: "sardis",
  previousOwner,
});

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
  attackerHex: { q: 5, r: 1 },
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

  it("renders a city-attack entry naming the city and the damage", () => {
    render(<MoveLog events={[cityAttackEvent(0, false)]} cityNames={CITY_NAMES} />);
    expect(screen.getByText(/besieged Sardis — dealt 30, took 8/)).not.toBeNull();
  });

  it("marks a breached city in the siege entry", () => {
    render(<MoveLog events={[cityAttackEvent(0, true)]} cityNames={CITY_NAMES} />);
    expect(screen.getByText("(walls breached)")).not.toBeNull();
  });

  it("renders a capture entry naming the capturer, city, and previous owner", () => {
    render(<MoveLog events={[captureEvent(0)]} cityNames={CITY_NAMES} />);
    expect(screen.getByText(/captured Sardis from Persia/)).not.toBeNull();
  });

  it("color-codes the capturer by faction", () => {
    render(<MoveLog events={[captureEvent(0)]} cityNames={CITY_NAMES} />);
    expect(screen.getByText("Macedon").getAttribute("data-faction")).toBe("macedon");
  });

  it("falls back to the city id when no name is supplied", () => {
    render(<MoveLog events={[captureEvent(0)]} />);
    expect(screen.getByText(/captured sardis from Persia/)).not.toBeNull();
  });

  it("frames a defection as the new owner winning the city", () => {
    render(
      <MoveLog
        events={[defectionEvent(0, "macedon", "persia")]}
        cityNames={CITY_NAMES}
        playerFaction="macedon"
      />,
    );
    expect(screen.getByText(/won over/)).not.toBeNull();
  });

  it("marks a defection the player gained", () => {
    render(
      <MoveLog
        events={[defectionEvent(0, "macedon", "persia")]}
        cityNames={CITY_NAMES}
        playerFaction="macedon"
      />,
    );
    expect(screen.getByText("Sardis").getAttribute("data-defection")).toBe("gain");
  });

  it("marks a defection the player lost", () => {
    render(
      <MoveLog
        events={[defectionEvent(0, "persia", "macedon")]}
        cityNames={CITY_NAMES}
        playerFaction="macedon"
      />,
    );
    expect(screen.getByText("Sardis").getAttribute("data-defection")).toBe("loss");
  });
});
