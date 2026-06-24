// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import type { Unit } from "@/engine/unit/types";
import { InfoPanel } from "./InfoPanel";

afterEach(cleanup);

const BASE: Unit = {
  id: "u1",
  typeId: "pezhetairos",
  owner: "macedon",
  hex: { q: 0, r: 0 },
  hp: 100,
  morale: 80,
  supplied: true,
  hasMovedThisTurn: false,
};

function panel() {
  return screen.getByRole("region", { name: "Selected unit" });
}

describe("InfoPanel supply", () => {
  it("omits the supply row for a supplied unit", () => {
    render(<InfoPanel unit={BASE} />);
    expect(panel().textContent).not.toContain("Supply");
  });

  it("does not warn about supply for a supplied unit", () => {
    render(<InfoPanel unit={BASE} />);
    expect(panel().textContent).not.toContain("Out of supply");
  });

  it("flags a cut-off unit as out of supply", () => {
    render(<InfoPanel unit={{ ...BASE, supplied: false }} />);
    expect(panel().textContent).toContain("Out of supply");
  });

  it("shows the first turn's HP attrition for a freshly cut-off unit", () => {
    render(<InfoPanel unit={{ ...BASE, supplied: false }} />);
    expect(panel().textContent).toContain("10 HP");
  });

  it("escalates the projected HP attrition with consecutive turns cut off", () => {
    render(<InfoPanel unit={{ ...BASE, supplied: false, outOfSupplyTurns: 2 }} />);
    expect(panel().textContent).toContain("20 HP");
  });

  it("shows the morale attrition for a cut-off unit", () => {
    render(<InfoPanel unit={{ ...BASE, supplied: false }} />);
    expect(panel().textContent).toContain("5 morale next turn");
  });

  it("explains what being out of supply does", () => {
    render(<InfoPanel unit={{ ...BASE, supplied: false }} />);
    expect(panel().textContent).toContain("until it reconnects");
  });

  it("surfaces supply for an enemy unit too", () => {
    render(<InfoPanel unit={{ ...BASE, owner: "persia", supplied: false }} />);
    expect(panel().textContent).toContain("Out of supply");
  });

  it("prompts to select a unit when none is given", () => {
    render(<InfoPanel unit={null} />);
    expect(screen.getByText("Select a unit to inspect it.")).toBeTruthy();
  });
});

describe("InfoPanel fortify", () => {
  it("omits the fortify row for an unfortified unit", () => {
    render(<InfoPanel unit={BASE} />);
    expect(panel().textContent).not.toContain("Fortified");
  });

  it("shows the level-one fortify bonus", () => {
    render(<InfoPanel unit={{ ...BASE, fortifiedTurns: 1 }} />);
    expect(panel().textContent).toContain("Fortified +3");
  });

  it("shows the level-two fortify bonus", () => {
    render(<InfoPanel unit={{ ...BASE, fortifiedTurns: 2 }} />);
    expect(panel().textContent).toContain("Fortified +6");
  });
});

describe("InfoPanel defend action", () => {
  it("offers the Defend button when the unit can defend", () => {
    render(<InfoPanel unit={BASE} canDefend onDefend={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Defend (F)" })).toBeTruthy();
  });

  it("hides the Defend button when the unit cannot defend", () => {
    render(<InfoPanel unit={BASE} canDefend={false} onDefend={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Defend (F)" })).toBeNull();
  });

  it("hides the Defend button when no handler is given", () => {
    render(<InfoPanel unit={BASE} canDefend />);
    expect(screen.queryByRole("button", { name: "Defend (F)" })).toBeNull();
  });

  it("invokes the handler with the unit id when clicked", () => {
    const onDefend = vi.fn();
    render(<InfoPanel unit={BASE} canDefend onDefend={onDefend} />);
    fireEvent.click(screen.getByRole("button", { name: "Defend (F)" }));
    expect(onDefend).toHaveBeenCalledWith("u1");
  });
});
