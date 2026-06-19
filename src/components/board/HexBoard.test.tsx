// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import type { Citation } from "@/engine/content/citation";
import type { NamedRegion } from "@/engine/content/region";
import { SAMPLE_MAP, SAMPLE_UNITS } from "@/engine/map/sample";
import { createGameMap } from "@/engine/map/types";
import { HexBoard } from "./HexBoard";

afterEach(cleanup);

Element.prototype.setPointerCapture = () => undefined;
Element.prototype.releasePointerCapture = () => undefined;
Element.prototype.hasPointerCapture = () => false;

const MACEDON = "Pezhetairos (macedon)";

const SEA_REGION: NamedRegion = {
  id: "test-sea",
  name: "Aegean Sea",
  kind: "sea",
  labelHex: { q: 0, r: 0 },
  citation: {
    claim: "x",
    source: { title: "t", url: "https://example.test", type: "reference" },
    confidence: "high",
  },
};

describe("HexBoard", () => {
  it("renders a polygon for every map hex", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(container.querySelectorAll("polygon.hex")).toHaveLength(SAMPLE_MAP.hexes.size);
  });

  it("renders a token for every unit", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(container.querySelectorAll("[data-unit-id]")).toHaveLength(SAMPLE_UNITS.length);
  });

  it("labels the city on the map", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(screen.getByText("Dascylium")).toBeTruthy();
  });

  it("hides unit stats until a unit is selected", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(screen.queryByText("Morale")).toBeNull();
  });

  it("shows the selected unit's stats after a click", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    fireEvent.click(screen.getByLabelText("Pezhetairos (macedon)"));
    expect(screen.getByText("Morale")).toBeTruthy();
  });

  it("renders a label for a named sea region", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[SEA_REGION]} />);
    expect(screen.getByText("Aegean Sea")).toBeTruthy();
  });
});

describe("HexBoard interaction", () => {
  it("renders a tint overlay for each reachable hex", () => {
    const { container } = render(
      <HexBoard
        map={SAMPLE_MAP}
        units={SAMPLE_UNITS}
        reachable={[
          { q: 1, r: 0 },
          { q: 0, r: 0 },
        ]}
      />,
    );
    expect(container.querySelectorAll("polygon.reach")).toHaveLength(2);
  });

  it("reports the unit id when a token is selected", () => {
    const onSelect = vi.fn();
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} onSelect={onSelect} />);
    fireEvent.click(screen.getByLabelText(MACEDON));
    expect(onSelect).toHaveBeenCalledWith("macedon-phalanx-1");
  });

  it("deselects when an empty hex is left-clicked", () => {
    const onSelect = vi.fn();
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} onSelect={onSelect} />,
    );
    fireEvent.click(screen.getByLabelText(MACEDON));
    fireEvent.click(container.querySelector('[data-hex="0,0"]')!);
    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("moves the selected unit when a reachable hex is right-clicked", () => {
    const onMove = vi.fn();
    const { container } = render(
      <HexBoard
        map={SAMPLE_MAP}
        units={SAMPLE_UNITS}
        reachable={[{ q: 1, r: 0 }]}
        onMove={onMove}
      />,
    );
    fireEvent.click(screen.getByLabelText(MACEDON));
    fireEvent.contextMenu(container.querySelector('[data-hex="1,0"]')!);
    expect(onMove).toHaveBeenCalledWith("macedon-phalanx-1", { q: 1, r: 0 });
  });

  it("ignores a right-click on an unreachable hex", () => {
    const onMove = vi.fn();
    const { container } = render(
      <HexBoard
        map={SAMPLE_MAP}
        units={SAMPLE_UNITS}
        reachable={[{ q: 1, r: 0 }]}
        onMove={onMove}
      />,
    );
    fireEvent.click(screen.getByLabelText(MACEDON));
    fireEvent.contextMenu(container.querySelector('[data-hex="2,2"]')!);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("moves on a tap of a reachable hex (touch)", () => {
    const onMove = vi.fn();
    const { container } = render(
      <HexBoard
        map={SAMPLE_MAP}
        units={SAMPLE_UNITS}
        reachable={[{ q: 1, r: 0 }]}
        onMove={onMove}
      />,
    );
    fireEvent.click(screen.getByLabelText(MACEDON));
    const hex = container.querySelector('[data-hex="1,0"]')!;
    fireEvent.pointerDown(hex, { pointerType: "touch", pointerId: 1 });
    fireEvent.pointerUp(hex, { pointerType: "touch", pointerId: 1 });
    fireEvent.click(hex);
    expect(onMove).toHaveBeenCalledWith("macedon-phalanx-1", { q: 1, r: 0 });
  });

  it("zooms the viewBox on a mouse wheel", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    const svg = container.querySelector("svg")!;
    svg.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 600,
      bottom: 600,
      width: 600,
      height: 600,
      toJSON: () => ({}),
    });
    const before = svg.getAttribute("viewBox");
    fireEvent.wheel(svg, { deltaY: -120, clientX: 300, clientY: 300 });
    expect(svg.getAttribute("viewBox")).not.toBe(before);
  });

  it("deselects on a tap of an unreachable hex (touch)", () => {
    const onSelect = vi.fn();
    const onMove = vi.fn();
    const { container } = render(
      <HexBoard
        map={SAMPLE_MAP}
        units={SAMPLE_UNITS}
        reachable={[{ q: 1, r: 0 }]}
        onSelect={onSelect}
        onMove={onMove}
      />,
    );
    fireEvent.click(screen.getByLabelText(MACEDON));
    const hex = container.querySelector('[data-hex="2,2"]')!;
    fireEvent.pointerDown(hex, { pointerType: "touch", pointerId: 1 });
    fireEvent.pointerUp(hex, { pointerType: "touch", pointerId: 1 });
    fireEvent.click(hex);
    expect(onMove).not.toHaveBeenCalled();
  });

  it("marks an adjacent enemy as an attack target after selecting an attacker", () => {
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} attackable={[{ q: 2, r: 1 }]} />,
    );
    fireEvent.click(screen.getByLabelText(MACEDON));
    expect(container.querySelector('[data-attack-target="persia-cavalry-1"]')).toBeTruthy();
  });

  it("hides the attack marker until an attacker is selected", () => {
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} attackable={[{ q: 2, r: 1 }]} />,
    );
    expect(container.querySelector("[data-attack-target]")).toBeNull();
  });

  it("attacks an enemy token on a right-click", () => {
    const onAttack = vi.fn();
    const { container } = render(
      <HexBoard
        map={SAMPLE_MAP}
        units={SAMPLE_UNITS}
        attackable={[{ q: 2, r: 1 }]}
        onAttack={onAttack}
      />,
    );
    fireEvent.click(screen.getByLabelText(MACEDON));
    fireEvent.contextMenu(container.querySelector('[data-unit-id="persia-cavalry-1"]')!);
    expect(onAttack).toHaveBeenCalledWith("macedon-phalanx-1", { q: 2, r: 1 });
  });

  it("attacks an enemy token on a tap (touch)", () => {
    const onAttack = vi.fn();
    const { container } = render(
      <HexBoard
        map={SAMPLE_MAP}
        units={SAMPLE_UNITS}
        attackable={[{ q: 2, r: 1 }]}
        onAttack={onAttack}
      />,
    );
    fireEvent.click(screen.getByLabelText(MACEDON));
    const enemy = container.querySelector('[data-unit-id="persia-cavalry-1"]')!;
    fireEvent.pointerDown(enemy, { pointerType: "touch", pointerId: 1 });
    fireEvent.pointerUp(enemy, { pointerType: "touch", pointerId: 1 });
    fireEvent.click(enemy);
    expect(onAttack).toHaveBeenCalledWith("macedon-phalanx-1", { q: 2, r: 1 });
  });

  it("does not attack an enemy that is not an attack target", () => {
    const onAttack = vi.fn();
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} attackable={[]} onAttack={onAttack} />,
    );
    fireEvent.click(screen.getByLabelText(MACEDON));
    fireEvent.contextMenu(container.querySelector('[data-unit-id="persia-cavalry-1"]')!);
    expect(onAttack).not.toHaveBeenCalled();
  });

  it("renders a floating damage number", () => {
    const { container } = render(
      <HexBoard
        map={SAMPLE_MAP}
        units={SAMPLE_UNITS}
        floaters={[{ id: "f1", hex: { q: 2, r: 1 }, text: "-24" }]}
      />,
    );
    expect(within(container).getByText("-24")).toBeTruthy();
  });

  it("renders a fading token for a defeated unit", () => {
    const defeated = SAMPLE_UNITS[1]!;
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={[SAMPLE_UNITS[0]!]} fadingUnits={[defeated]} />,
    );
    expect(container.querySelector('[data-fading-id="persia-cavalry-1"]')).toBeTruthy();
  });

  it("shows Q and R coordinates when the debug panel toggle is checked", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    const cell = screen.getByTestId("hex-0,0");
    expect(within(cell).queryByText("0, 0")).toBeNull();
    fireEvent.click(screen.getByLabelText("Show Q and R coordinates?"));
    expect(within(cell).getByText("0, 0")).toBeTruthy();
  });

  it("hides Q and R coordinates when the debug panel toggle is unchecked", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    const cell = screen.getByTestId("hex-0,0");
    fireEvent.click(screen.getByLabelText("Show Q and R coordinates?"));
    fireEvent.click(screen.getByLabelText("Show Q and R coordinates?"));
    expect(within(cell).queryByText("0, 0")).toBeNull();
  });
});

const LYDIA_CITATION: Citation = {
  claim: "Lydia, with its capital Sardis, lay inland to the southeast.",
  source: { title: "Lydia", url: "https://en.wikipedia.org/wiki/Lydia", type: "reference" },
  confidence: "high",
};

const LYDIA_REGION: NamedRegion = {
  id: "lydia",
  name: "Lydia",
  kind: "region",
  labelHex: { q: 1, r: 0 },
  citation: LYDIA_CITATION,
};

const GRANICUS_REGION: NamedRegion = {
  id: "granicus",
  name: "Granicus",
  kind: "river",
  citation: {
    claim: "Site of the 334 BC battle.",
    source: { title: "Battle of the Granicus", type: "primary" },
    confidence: "high",
  },
};

const CITED_CITY_MAP = createGameMap(
  [
    { hex: { q: 0, r: 0 }, terrain: "plains", cityId: "sardis" },
    { hex: { q: 1, r: 0 }, terrain: "plains" },
  ],
  [
    {
      id: "sardis",
      name: "Sardis",
      hex: { q: 0, r: 0 },
      owner: "persia",
      value: 100,
      defense: 20,
      citation: {
        claim: "Sardis was the Lydian capital.",
        source: { title: "Sardis", url: "https://en.wikipedia.org/wiki/Sardis", type: "reference" },
        confidence: "high",
      },
    },
  ],
);

describe("HexBoard historical references", () => {
  it("reveals a region's cited claim when its label is focused", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[LYDIA_REGION]} />);
    fireEvent.focus(screen.getByRole("button", { name: "Lydia historical reference" }));
    expect(
      screen.getByText("Lydia, with its capital Sardis, lay inland to the southeast."),
    ).toBeTruthy();
  });

  it("anchors the Granicus citation on the river course", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[GRANICUS_REGION]} />);
    fireEvent.click(screen.getByRole("button", { name: "Granicus historical reference" }));
    expect(screen.getByText("Site of the 334 BC battle.")).toBeTruthy();
  });

  it("surfaces a city's citation when its name is clicked", () => {
    render(<HexBoard map={CITED_CITY_MAP} units={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Sardis historical reference" }));
    expect(screen.getByText("Sardis was the Lydian capital.")).toBeTruthy();
  });

  it("dismisses the citation card on Escape", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[LYDIA_REGION]} />);
    fireEvent.focus(screen.getByRole("button", { name: "Lydia historical reference" }));
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("leaves an un-cited city label non-interactive", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(screen.queryByRole("button", { name: "Dascylium historical reference" })).toBeNull();
  });
});
