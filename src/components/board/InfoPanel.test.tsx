// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
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
  it("labels a supplied unit as Supplied", () => {
    render(<InfoPanel unit={BASE} />);
    expect(panel().textContent).toContain("Supplied");
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

  it("surfaces supply for an enemy unit too", () => {
    render(<InfoPanel unit={{ ...BASE, owner: "persia", supplied: false }} />);
    expect(panel().textContent).toContain("Out of supply");
  });

  it("prompts to select a unit when none is given", () => {
    render(<InfoPanel unit={null} />);
    expect(screen.getByText("Select a unit to inspect it.")).toBeTruthy();
  });
});
