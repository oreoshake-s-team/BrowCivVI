// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import type { Citation } from "@/engine/content/citation";
import type { NamedRegion } from "@/engine/content/region";
import { SAMPLE_MAP, SAMPLE_UNITS } from "@/engine/map/sample";
import { createGameMap } from "@/engine/map/types";
import { cityMaxHp, WALL_MAX_HP, type CityState } from "@/engine/match/cities";
import { unitTypeById } from "@/engine/unit/catalog";
import type { Unit } from "@/engine/unit/types";
import { HexBoard } from "./HexBoard";

afterEach(cleanup);

Element.prototype.setPointerCapture = () => undefined;
Element.prototype.releasePointerCapture = () => undefined;
Element.prototype.hasPointerCapture = () => false;

const MACEDON = "Pezhetairos (macedon)";
const MAC_ID = "macedon-phalanx-1";
const MAC_MAX = unitTypeById("pezhetairos")?.movement ?? 0;
const PER_ID = "persia-cavalry-1";
const PER_MAX = unitTypeById("persian-cavalry")?.movement ?? 0;

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

  it("renders each unit as a faction-tinted sprite symbol", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(container.querySelectorAll('use[href^="#unit-sprite-"]')).toHaveLength(
      SAMPLE_UNITS.length,
    );
  });

  it("labels the city on the map", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(screen.getByText("Dascylium")).toBeTruthy();
  });

  it("marks a unit with no actions left as spent", () => {
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} spent={[MAC_ID]} />,
    );
    expect(container.querySelector(`[data-spent="${MAC_ID}"]`)).not.toBeNull();
  });

  it("leaves a unit that still has actions undimmed", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(container.querySelector("[data-spent]")).toBeNull();
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

  it("draws a coastline band where land meets adjacent water", () => {
    const coastMap = createGameMap(
      [
        { hex: { q: 0, r: 0 }, terrain: "plains" },
        { hex: { q: 1, r: 0 }, terrain: "coast" },
      ],
      [],
    );
    const { container } = render(<HexBoard map={coastMap} units={[]} />);
    expect(container.querySelector('[data-coastline="0,0|1,0"]')).not.toBeNull();
  });

  it("draws no coastline between two land hexes", () => {
    const landMap = createGameMap(
      [
        { hex: { q: 0, r: 0 }, terrain: "plains" },
        { hex: { q: 1, r: 0 }, terrain: "hills" },
      ],
      [],
    );
    const { container } = render(<HexBoard map={landMap} units={[]} />);
    expect(container.querySelector("[data-coastline]")).toBeNull();
  });

  it("draws a royal road segment for an authored road", () => {
    const roadMap = createGameMap(
      [
        { hex: { q: 0, r: 0 }, terrain: "plains" },
        { hex: { q: 1, r: 0 }, terrain: "hills" },
      ],
      [],
      [],
      [{ a: { q: 0, r: 0 }, b: { q: 1, r: 0 }, royal: true }],
    );
    const { container } = render(<HexBoard map={roadMap} units={[]} />);
    expect(container.querySelector('[data-road="royal"]')).not.toBeNull();
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

  it("moves the selected unit when a reachable hex is left-clicked", () => {
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
    fireEvent.click(container.querySelector('[data-hex="1,0"]')!);
    expect(onMove).toHaveBeenCalledWith("macedon-phalanx-1", { q: 1, r: 0 });
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

  it("arms an in-range enemy on the first click without attacking", () => {
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
    fireEvent.click(container.querySelector('[data-unit-id="persia-cavalry-1"]')!);
    expect(onAttack).not.toHaveBeenCalled();
  });

  it("marks the armed enemy with an Attack confirm", () => {
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} attackable={[{ q: 2, r: 1 }]} />,
    );
    fireEvent.click(screen.getByLabelText(MACEDON));
    fireEvent.click(container.querySelector('[data-unit-id="persia-cavalry-1"]')!);
    expect(container.querySelector('[data-attack-armed="persia-cavalry-1"]')).not.toBeNull();
  });

  it("attacks an armed enemy on the second click", () => {
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
    fireEvent.click(enemy);
    fireEvent.click(enemy);
    expect(onAttack).toHaveBeenCalledWith("macedon-phalanx-1", { q: 2, r: 1 });
  });

  it("disarms a pending attack on Escape", () => {
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} attackable={[{ q: 2, r: 1 }]} />,
    );
    fireEvent.click(screen.getByLabelText(MACEDON));
    fireEvent.click(container.querySelector('[data-unit-id="persia-cavalry-1"]')!);
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(container.querySelector("[data-attack-armed]")).toBeNull();
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

const MEDIA_REGION: NamedRegion = {
  ...LYDIA_REGION,
  media: [
    {
      id: "lydia-pod",
      title: "Lydia (Tides of History)",
      url: "https://example.test/lydia",
      kind: "podcast",
    },
  ],
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
  media: [
    {
      id: "granicus-doc",
      title: "Battle of Granicus 334 BC (Kings and Generals)",
      url: "https://www.youtube.com/watch?v=s40yYSWkrzk",
      kind: "video",
    },
  ],
};

const SARDIS_CITATION: Citation = {
  claim: "Sardis was the Lydian capital.",
  source: { title: "Sardis", url: "https://en.wikipedia.org/wiki/Sardis", type: "reference" },
  confidence: "high",
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
      citation: SARDIS_CITATION,
    },
  ],
);

const WALLED_CITY_MAP = createGameMap(
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
      walls: true,
      citation: SARDIS_CITATION,
    },
  ],
);

const MEDIA_CITY_MAP = createGameMap(
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
      citation: SARDIS_CITATION,
      media: [
        {
          id: "sardis-pod",
          title: "Sardis (Tides of History)",
          url: "https://example.test/sardis",
          kind: "podcast",
        },
      ],
    },
  ],
);

describe("HexBoard historical references", () => {
  it("reveals a region's reference when it has linked media", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[MEDIA_REGION]} />);
    fireEvent.focus(screen.getByRole("button", { name: "Lydia historical reference" }));
    expect(
      screen.getByText("Lydia, with its capital Sardis, lay inland to the southeast."),
    ).toBeTruthy();
  });

  it("leaves a media-less region label non-interactive", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[LYDIA_REGION]} />);
    expect(screen.queryByRole("button", { name: "Lydia historical reference" })).toBeNull();
  });

  it("still renders a media-less region's label text", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[LYDIA_REGION]} />);
    expect(screen.getByText("Lydia")).toBeTruthy();
  });

  it("anchors the Granicus citation on the river course", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[GRANICUS_REGION]} />);
    fireEvent.click(screen.getByRole("button", { name: "Granicus historical reference" }));
    expect(screen.getByText("Site of the 334 BC battle.")).toBeTruthy();
  });

  it("surfaces the river's related media links", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[GRANICUS_REGION]} />);
    fireEvent.click(screen.getByRole("button", { name: "Granicus historical reference" }));
    expect(
      screen
        .getByRole("link", { name: "Video Battle of Granicus 334 BC (Kings and Generals)" })
        .getAttribute("href"),
    ).toBe("https://www.youtube.com/watch?v=s40yYSWkrzk");
  });

  it("reveals the Granicus reference when an unoccupied bordering tile is hovered", () => {
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={[]} regions={[GRANICUS_REGION]} />,
    );
    const bank = container.querySelector<SVGPolygonElement>('polygon[data-hex="1,1"]');
    if (bank === null) throw new Error("bank tile not rendered");
    fireEvent.mouseEnter(bank);
    expect(screen.getByText("Site of the 334 BC battle.")).toBeTruthy();
  });

  it("hides the riverbank reference on hover when a unit occupies the tile", () => {
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[GRANICUS_REGION]} />,
    );
    const bank = container.querySelector<SVGPolygonElement>('polygon[data-hex="1,1"]');
    if (bank === null) throw new Error("bank tile not rendered");
    fireEvent.mouseEnter(bank);
    expect(screen.queryByText("Site of the 334 BC battle.")).toBeNull();
  });

  it("hides the riverbank reference on hover while a unit is selected", () => {
    const { container } = render(
      <HexBoard
        map={SAMPLE_MAP}
        units={[
          {
            id: "macedon-phalanx-1",
            typeId: "pezhetairos",
            owner: "macedon",
            hex: { q: 2, r: 2 },
            hp: 100,
            morale: 80,
            supplied: true,
            hasMovedThisTurn: false,
          },
        ]}
        regions={[GRANICUS_REGION]}
      />,
    );
    fireEvent.click(screen.getByLabelText(MACEDON));
    const bank = container.querySelector<SVGPolygonElement>('polygon[data-hex="1,1"]');
    if (bank === null) throw new Error("bank tile not rendered");
    fireEvent.mouseEnter(bank);
    expect(screen.queryByText("Site of the 334 BC battle.")).toBeNull();
  });

  it("still reveals the Granicus reference on keyboard focus of an occupied tile", () => {
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[GRANICUS_REGION]} />,
    );
    const bank = container.querySelector<SVGPolygonElement>('polygon[data-hex="1,1"]');
    if (bank === null) throw new Error("bank tile not rendered");
    fireEvent.focus(bank);
    expect(screen.getByText("Site of the 334 BC battle.")).toBeTruthy();
  });

  it("does not surface the reference when a bordering tile is clicked", () => {
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[GRANICUS_REGION]} />,
    );
    const bank = container.querySelector<SVGPolygonElement>('polygon[data-hex="1,1"]');
    if (bank === null) throw new Error("bank tile not rendered");
    fireEvent.click(bank);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("marks every bordering land tile on the bank", () => {
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[GRANICUS_REGION]} />,
    );
    expect(container.querySelectorAll("polygon.bank")).toHaveLength(2);
  });

  it("excludes water tiles from the river bank", () => {
    const coastBankMap = createGameMap(
      [
        { hex: { q: 0, r: 0 }, terrain: "coast" },
        { hex: { q: 1, r: 0 }, terrain: "plains" },
      ],
      [],
      [{ a: { q: 0, r: 0 }, b: { q: 1, r: 0 } }],
    );
    const { container } = render(
      <HexBoard map={coastBankMap} units={[]} regions={[GRANICUS_REGION]} />,
    );
    expect(container.querySelectorAll("polygon.bank")).toHaveLength(1);
  });

  it("surfaces a city's reference when it has linked media", () => {
    render(<HexBoard map={MEDIA_CITY_MAP} units={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Sardis historical reference" }));
    expect(screen.getByText("Sardis was the Lydian capital.")).toBeTruthy();
  });

  it("leaves a media-less cited city label non-interactive", () => {
    render(<HexBoard map={CITED_CITY_MAP} units={[]} />);
    expect(screen.queryByRole("button", { name: "Sardis historical reference" })).toBeNull();
  });

  it("marks a media-bearing city label with the media glyph", () => {
    const { container } = render(<HexBoard map={MEDIA_CITY_MAP} units={[]} />);
    expect(container.textContent).toContain("▶");
  });

  it("leaves a media-less city label without a media glyph", () => {
    const { container } = render(<HexBoard map={CITED_CITY_MAP} units={[]} />);
    expect(container.textContent).not.toContain("▶");
  });

  it("marks the Granicus river with the media glyph", () => {
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[GRANICUS_REGION]} />,
    );
    expect(container.textContent).toContain("▶");
  });

  it("dismisses the citation card on Escape", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[GRANICUS_REGION]} />);
    fireEvent.focus(screen.getByRole("button", { name: "Granicus historical reference" }));
    fireEvent.keyDown(document.body, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("leaves an un-cited city label non-interactive", () => {
    render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(screen.queryByRole("button", { name: "Dascylium historical reference" })).toBeNull();
  });
});

describe("HexBoard movement display", () => {
  const friendly = (over: Partial<Parameters<typeof HexBoard>[0]> = {}) => (
    <HexBoard
      map={SAMPLE_MAP}
      units={SAMPLE_UNITS}
      playerFaction="macedon"
      movement={{ [MAC_ID]: 2 }}
      {...over}
    />
  );

  it("shows a movement badge on a friendly unit with movement left", () => {
    const { container } = render(friendly());
    expect(container.querySelector(`[data-moves="${MAC_ID}"]`)?.textContent).toBe(`2/${MAC_MAX}`);
  });

  it("omits an enemy unit's badge until it is selected or hovered", () => {
    const { container } = render(friendly({ movement: { [MAC_ID]: 2, [PER_ID]: 4 } }));
    expect(container.querySelector(`[data-moves="${PER_ID}"]`)).toBeNull();
  });

  it("reveals an enemy unit's badge when it is selected", () => {
    const { container } = render(friendly({ movement: { [MAC_ID]: 2, [PER_ID]: 4 } }));
    fireEvent.click(container.querySelector(`[data-unit-id="${PER_ID}"]`)!);
    expect(container.querySelector(`[data-moves="${PER_ID}"]`)?.textContent).toBe(`4/${PER_MAX}`);
  });

  it("reveals an enemy unit's badge on hover", () => {
    const { container } = render(friendly({ movement: { [MAC_ID]: 2, [PER_ID]: 4 } }));
    fireEvent.mouseEnter(container.querySelector(`[data-unit-id="${PER_ID}"]`)!);
    expect(container.querySelector(`[data-moves="${PER_ID}"]`)).not.toBeNull();
  });

  it("reveals an enemy unit's badge on keyboard focus", () => {
    const { container } = render(friendly({ movement: { [MAC_ID]: 2, [PER_ID]: 4 } }));
    fireEvent.focus(container.querySelector(`[data-unit-id="${PER_ID}"]`)!);
    expect(container.querySelector(`[data-moves="${PER_ID}"]`)).not.toBeNull();
  });

  it("reveals a spent enemy unit's badge when selected", () => {
    const { container } = render(friendly({ movement: { [MAC_ID]: 2, [PER_ID]: 0 } }));
    fireEvent.click(container.querySelector(`[data-unit-id="${PER_ID}"]`)!);
    expect(container.querySelector(`[data-moves="${PER_ID}"]`)?.textContent).toBe(`0/${PER_MAX}`);
  });

  it("omits the badge once a friendly unit's movement is spent", () => {
    const { container } = render(friendly({ movement: { [MAC_ID]: 0 } }));
    expect(container.querySelector(`[data-moves="${MAC_ID}"]`)).toBeNull();
  });

  it("shows the selected unit's remaining movement in the panel", () => {
    render(friendly());
    fireEvent.click(screen.getByLabelText(MACEDON));
    expect(screen.getByText(`2 / ${MAC_MAX}`)).toBeTruthy();
  });

  it("shows a zero in the panel when the selected unit's movement is spent", () => {
    render(friendly({ movement: { [MAC_ID]: 0 } }));
    fireEvent.click(screen.getByLabelText(MACEDON));
    expect(screen.getByText(`0 / ${MAC_MAX}`)).toBeTruthy();
  });
});

describe("HexBoard action prompt", () => {
  it("prompts the player to select a unit when none is selected", () => {
    render(
      <HexBoard
        map={SAMPLE_MAP}
        units={SAMPLE_UNITS}
        playerFaction="macedon"
        movement={{ [MAC_ID]: 2 }}
      />,
    );
    expect(screen.getByText("Select a unit to move or attack.")).toBeTruthy();
  });

  it("drops the prompt once a unit is selected", () => {
    render(
      <HexBoard
        map={SAMPLE_MAP}
        units={SAMPLE_UNITS}
        playerFaction="macedon"
        movement={{ [MAC_ID]: 2 }}
      />,
    );
    fireEvent.click(screen.getByLabelText(MACEDON));
    expect(screen.queryByText("Select a unit to move or attack.")).toBeNull();
  });

  it("omits the prompt when the player has no units left to act", () => {
    render(
      <HexBoard
        map={SAMPLE_MAP}
        units={SAMPLE_UNITS}
        playerFaction="macedon"
        movement={{ [MAC_ID]: 0 }}
      />,
    );
    expect(screen.queryByText("Select a unit to move or attack.")).toBeNull();
  });
});

describe("HexBoard terrain motifs", () => {
  it("draws a peaks motif on a mountain hex", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(container.querySelector('[data-motif="mountain"]')).toBeTruthy();
  });

  it("draws a waves motif on a coast hex", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(container.querySelector('[data-motif="coast"]')).toBeTruthy();
  });

  it("draws a motif on a hills hex", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(container.querySelector('[data-motif="hills"]')).toBeTruthy();
  });

  it("draws no motif on plains", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(container.querySelector('[data-motif="plains"]')).toBeNull();
  });

  it("suppresses the motif on a hex that carries a region label", () => {
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} regions={[SEA_REGION]} />,
    );
    expect(container.querySelector('[data-motif="coast"]')).toBeNull();
  });

  it("marks an impassable tile as blocked", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(container.querySelector('[data-hex="1,2"][data-blocked]')).toBeTruthy();
  });

  it("leaves a passable tile unblocked", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(container.querySelector('[data-hex="1,0"][data-blocked]')).toBeNull();
  });

  it("marks a burned hex with a scorch glyph", () => {
    const { container } = render(
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} scorched={["1,0"]} />,
    );
    expect(container.querySelector('[data-scorched="1,0"]')).toBeTruthy();
  });

  it("leaves an unburned hex without a scorch glyph", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(container.querySelector("[data-scorched]")).toBeNull();
  });

  it("badges an out-of-supply unit", () => {
    const units = SAMPLE_UNITS.map((u) => (u.id === MAC_ID ? { ...u, supplied: false } : u));
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={units} />);
    expect(container.querySelector(`[data-out-of-supply="${MAC_ID}"]`)).toBeTruthy();
  });

  it("announces an out-of-supply unit to assistive tech", () => {
    const units = SAMPLE_UNITS.map((u) => (u.id === MAC_ID ? { ...u, supplied: false } : u));
    render(<HexBoard map={SAMPLE_MAP} units={units} />);
    expect(screen.getByRole("button", { name: `${MACEDON} — out of supply` })).toBeTruthy();
  });

  it("leaves a supplied unit without an out-of-supply badge", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(container.querySelector("[data-out-of-supply]")).toBeNull();
  });
});

describe("HexBoard fortify badge", () => {
  const fortify = (id: string, turns: number): readonly Unit[] =>
    SAMPLE_UNITS.map((u) => (u.id === id ? { ...u, fortifiedTurns: turns } : u));

  it("badges a fortified unit with its level", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={fortify(MAC_ID, 2)} />);
    expect(container.querySelector(`[data-fortify="${MAC_ID}"]`)?.textContent).toBe("2");
  });

  it("leaves an unfortified unit without a fortify badge", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(container.querySelector("[data-fortify]")).toBeNull();
  });

  it("announces a fortified unit to assistive tech", () => {
    render(<HexBoard map={SAMPLE_MAP} units={fortify(MAC_ID, 1)} />);
    expect(screen.getByRole("button", { name: `${MACEDON} — fortified` })).toBeTruthy();
  });
});

describe("HexBoard defend action", () => {
  const props = (onDefend: () => void) => ({
    map: SAMPLE_MAP,
    units: SAMPLE_UNITS,
    playerFaction: "macedon",
    movement: { [MAC_ID]: MAC_MAX },
    interactive: true,
    onDefend,
  });

  it("offers the Defend button for the player's selected unit", () => {
    render(<HexBoard {...props(vi.fn())} />);
    fireEvent.click(screen.getByLabelText(MACEDON));
    expect(screen.getByRole("button", { name: "Defend (F)" })).toBeTruthy();
  });

  it("defends the selected unit when the button is clicked", () => {
    const onDefend = vi.fn();
    render(<HexBoard {...props(onDefend)} />);
    fireEvent.click(screen.getByLabelText(MACEDON));
    fireEvent.click(screen.getByRole("button", { name: "Defend (F)" }));
    expect(onDefend).toHaveBeenCalledWith(MAC_ID);
  });

  it("defends the selected unit with the F shortcut", () => {
    const onDefend = vi.fn();
    render(<HexBoard {...props(onDefend)} />);
    fireEvent.click(screen.getByLabelText(MACEDON));
    fireEvent.keyDown(window, { key: "f" });
    expect(onDefend).toHaveBeenCalledWith(MAC_ID);
  });

  it("does not offer the Defend button for a spent unit", () => {
    render(<HexBoard {...props(vi.fn())} movement={{ [MAC_ID]: 0 }} />);
    fireEvent.click(screen.getByLabelText(MACEDON));
    expect(screen.queryByRole("button", { name: "Defend (F)" })).toBeNull();
  });

  it("does not offer the Defend button when the board is not interactive", () => {
    render(<HexBoard {...props(vi.fn())} interactive={false} />);
    fireEvent.click(screen.getByLabelText(MACEDON));
    expect(screen.queryByRole("button", { name: "Defend (F)" })).toBeNull();
  });
});

describe("HexBoard unit health", () => {
  const wound = (id: string, hp: number): readonly Unit[] =>
    SAMPLE_UNITS.map((u) => (u.id === id ? { ...u, hp } : u));

  it("renders a health bar for a damaged unit", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={wound(MAC_ID, 60)} />);
    expect(container.querySelector(`[data-unit-hp="${MAC_ID}"]`)).not.toBeNull();
  });

  it("leaves a full-health unit without a health bar", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />);
    expect(container.querySelector("[data-unit-hp]")).toBeNull();
  });

  it("shows a health bar on a damaged enemy unit", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={wound(PER_ID, 50)} />);
    expect(container.querySelector(`[data-unit-hp="${PER_ID}"]`)).not.toBeNull();
  });

  it("flags a critically wounded unit's health bar as low", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={wound(MAC_ID, 20)} />);
    expect(container.querySelector(`[data-unit-hp="${MAC_ID}"] [data-low]`)).not.toBeNull();
  });

  it("does not flag a lightly wounded unit's health bar as low", () => {
    const { container } = render(<HexBoard map={SAMPLE_MAP} units={wound(MAC_ID, 80)} />);
    expect(container.querySelector(`[data-unit-hp="${MAC_ID}"] [data-low]`)).toBeNull();
  });

  it("labels the health bar with the current and max HP for assistive tech", () => {
    render(<HexBoard map={SAMPLE_MAP} units={wound(MAC_ID, 40)} />);
    expect(screen.getByRole("img", { name: "Pezhetairos: 40 of 100 HP" })).not.toBeNull();
  });
});

const SARDIS_HEX = { q: 0, r: 0 };
const SARDIS_MAX = cityMaxHp(20);
const ADJACENT_MAC: Unit = {
  id: MAC_ID,
  typeId: "pezhetairos",
  owner: "macedon",
  hex: { q: 1, r: 0 },
  hp: 100,
  morale: 80,
  supplied: true,
  hasMovedThisTurn: false,
};

function persiaSardis(hp: number): readonly CityState[] {
  return [{ id: "sardis", owner: "persia", hp }];
}

describe("HexBoard city rendering", () => {
  it("tints a city hex with its current owner's faction fill", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={persiaSardis(SARDIS_MAX)} />,
    );
    const tint = container.querySelector('[data-city-tint="sardis"]');
    expect(tint?.getAttribute("style")).toContain("--faction-persia-fill");
  });

  it("recolors a captured city to the new owner", () => {
    const { container } = render(
      <HexBoard
        map={CITED_CITY_MAP}
        units={[]}
        cities={[{ id: "sardis", owner: "macedon", hp: SARDIS_MAX }]}
      />,
    );
    const tint = container.querySelector('[data-city-tint="sardis"]');
    expect(tint?.getAttribute("style")).toContain("--faction-macedon-fill");
  });

  it("outlines a city hex with its owner's faction color", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={persiaSardis(SARDIS_MAX)} />,
    );
    const border = container.querySelector('[data-city-border="sardis"]');
    expect(border?.getAttribute("style")).toContain("--faction-persia-stroke");
  });

  it("renders a city HP bar", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={persiaSardis(SARDIS_MAX)} />,
    );
    expect(container.querySelector('[data-city-hp="sardis"]')).not.toBeNull();
  });

  it("flags a heavily damaged city's HP bar as low", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={persiaSardis(20)} />,
    );
    expect(container.querySelector('[data-city-hp="sardis"] [data-low]')).not.toBeNull();
  });

  it("does not flag a healthy city's HP bar as low", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={persiaSardis(SARDIS_MAX)} />,
    );
    expect(container.querySelector('[data-city-hp="sardis"] [data-low]')).toBeNull();
  });

  it("labels the HP bar with the current and max HP for assistive tech", () => {
    render(<HexBoard map={CITED_CITY_MAP} units={[]} cities={persiaSardis(40)} />);
    expect(screen.getByRole("img", { name: `Sardis: 40 of ${SARDIS_MAX} HP` })).not.toBeNull();
  });

  it("renders a wall bar for a walled city with standing walls", () => {
    const { container } = render(
      <HexBoard
        map={WALLED_CITY_MAP}
        units={[]}
        cities={[{ id: "sardis", owner: "persia", hp: SARDIS_MAX, wallHp: WALL_MAX_HP }]}
      />,
    );
    expect(container.querySelector('[data-city-wall="sardis"]')).not.toBeNull();
  });

  it("shows no wall bar for an unwalled city", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={persiaSardis(SARDIS_MAX)} />,
    );
    expect(container.querySelector("[data-city-wall]")).toBeNull();
  });

  it("drops the wall bar once the walls are breached", () => {
    const { container } = render(
      <HexBoard
        map={WALLED_CITY_MAP}
        units={[]}
        cities={[{ id: "sardis", owner: "persia", hp: SARDIS_MAX, wallHp: 0 }]}
      />,
    );
    expect(container.querySelector("[data-city-wall]")).toBeNull();
  });

  it("labels the wall bar with the current and max wall HP for assistive tech", () => {
    render(
      <HexBoard
        map={WALLED_CITY_MAP}
        units={[]}
        cities={[{ id: "sardis", owner: "persia", hp: SARDIS_MAX, wallHp: 60 }]}
      />,
    );
    expect(screen.getByRole("img", { name: `Sardis walls: 60 of ${WALL_MAX_HP}` })).not.toBeNull();
  });

  it("offers a city as an attack target once a unit is selected", () => {
    const { container } = render(
      <HexBoard
        map={CITED_CITY_MAP}
        units={[ADJACENT_MAC]}
        cities={persiaSardis(SARDIS_MAX)}
        attackable={[SARDIS_HEX]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: MACEDON }));
    expect(container.querySelector('[data-city-attack="sardis"]')).not.toBeNull();
  });

  it("does not offer a city as a target when it is out of range", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[ADJACENT_MAC]} cities={persiaSardis(SARDIS_MAX)} />,
    );
    fireEvent.click(screen.getByRole("button", { name: MACEDON }));
    expect(container.querySelector('[data-city-attack="sardis"]')).toBeNull();
  });

  it("sends a city-attack intent when a targeted city is confirmed", () => {
    const onAttackCity = vi.fn();
    const { container } = render(
      <HexBoard
        map={CITED_CITY_MAP}
        units={[ADJACENT_MAC]}
        cities={persiaSardis(SARDIS_MAX)}
        attackable={[SARDIS_HEX]}
        onAttackCity={onAttackCity}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: MACEDON }));
    const target = container.querySelector('[data-city-attack="sardis"]')!;
    fireEvent.click(target);
    fireEvent.click(target);
    expect(onAttackCity).toHaveBeenCalledWith(MAC_ID, "sardis");
  });

  it("arms a targeted city on the first click without attacking", () => {
    const onAttackCity = vi.fn();
    const { container } = render(
      <HexBoard
        map={CITED_CITY_MAP}
        units={[ADJACENT_MAC]}
        cities={persiaSardis(SARDIS_MAX)}
        attackable={[SARDIS_HEX]}
        onAttackCity={onAttackCity}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: MACEDON }));
    fireEvent.click(container.querySelector('[data-city-attack="sardis"]')!);
    expect(onAttackCity).not.toHaveBeenCalled();
  });

  it("covers the whole city hex with an interactive hit area, not just the X strokes", () => {
    const onAttackCity = vi.fn();
    const { container } = render(
      <HexBoard
        map={CITED_CITY_MAP}
        units={[ADJACENT_MAC]}
        cities={persiaSardis(SARDIS_MAX)}
        attackable={[SARDIS_HEX]}
        onAttackCity={onAttackCity}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: MACEDON }));
    const hitArea = container.querySelector('[data-city-attack="sardis"] polygon');
    expect(hitArea).not.toBeNull();
    fireEvent.click(hitArea!);
    fireEvent.click(hitArea!);
    expect(onAttackCity).toHaveBeenCalledWith(MAC_ID, "sardis");
  });
});

const HILLS_CITY_MAP = createGameMap(
  [{ hex: { q: 0, r: 0 }, terrain: "hills", cityId: "sardis" }],
  [
    {
      id: "sardis",
      name: "Sardis",
      hex: { q: 0, r: 0 },
      owner: "persia",
      value: 100,
      defense: 20,
      citation: SARDIS_CITATION,
    },
  ],
);

describe("HexBoard city markers", () => {
  it("draws a settlement marker on a city hex", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={persiaSardis(SARDIS_MAX)} />,
    );
    expect(container.querySelector('[data-city-marker="sardis"]')).not.toBeNull();
  });

  it("draws no settlement marker on a hex without a city", () => {
    const plainsOnly = createGameMap([{ hex: { q: 0, r: 0 }, terrain: "plains" }], []);
    const { container } = render(<HexBoard map={plainsOnly} units={[]} />);
    expect(container.querySelector("[data-city-marker]")).toBeNull();
  });

  it("tints the settlement marker with the owner's faction color", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={persiaSardis(SARDIS_MAX)} />,
    );
    expect(container.querySelector('[data-city-marker="sardis"]')?.getAttribute("style")).toContain(
      "--faction-persia-stroke",
    );
  });

  it("marks a Macedon city with the Macedonian sigil", () => {
    const { container } = render(
      <HexBoard
        map={CITED_CITY_MAP}
        units={[]}
        cities={[{ id: "sardis", owner: "macedon", hp: SARDIS_MAX }]}
      />,
    );
    expect(container.querySelector('[data-city-sigil="macedon"]')).not.toBeNull();
  });

  it("marks a Persia city with the Persian sigil", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={persiaSardis(SARDIS_MAX)} />,
    );
    expect(container.querySelector('[data-city-sigil="persia"]')).not.toBeNull();
  });

  it("marks an unowned city with the neutral sigil", () => {
    const neutralMap = createGameMap(
      [{ hex: { q: 0, r: 0 }, terrain: "plains", cityId: "ilium" }],
      [
        {
          id: "ilium",
          name: "Ilium",
          hex: { q: 0, r: 0 },
          owner: null,
          value: 50,
          defense: 10,
          citation: SARDIS_CITATION,
        },
      ],
    );
    const { container } = render(
      <HexBoard map={neutralMap} units={[]} cities={[{ id: "ilium", owner: null, hp: 100 }]} />,
    );
    expect(container.querySelector('[data-city-sigil="neutral"]')).not.toBeNull();
  });

  it("suppresses the terrain motif on a city hex", () => {
    const { container } = render(
      <HexBoard map={HILLS_CITY_MAP} units={[]} cities={persiaSardis(SARDIS_MAX)} />,
    );
    expect(container.querySelector('[data-motif="hills"]')).toBeNull();
  });
});

function sardisLoyalty(loyalty: number): readonly CityState[] {
  return [{ id: "sardis", owner: "persia", hp: SARDIS_MAX, loyalty }];
}

describe("HexBoard loyalty meter", () => {
  it("shows the loyalty meter on a contested city", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={sardisLoyalty(-20)} />,
    );
    expect(container.querySelector('[data-city-loyalty="sardis"]')).not.toBeNull();
  });

  it("hides the loyalty meter on a city settled with its owner", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={sardisLoyalty(-60)} />,
    );
    expect(container.querySelector('[data-city-loyalty="sardis"]')).toBeNull();
  });

  it("fills the meter toward Macedon when loyalty is positive", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={sardisLoyalty(40)} />,
    );
    expect(
      container.querySelector('[data-city-loyalty="sardis"] [data-leaning="macedon"]'),
    ).not.toBeNull();
  });

  it("fills the meter toward Persia when loyalty is negative", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={sardisLoyalty(-20)} />,
    );
    expect(
      container.querySelector('[data-city-loyalty="sardis"] [data-leaning="persia"]'),
    ).not.toBeNull();
  });

  it("pulses a wavering glow when a city crosses the threshold toward the enemy", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={sardisLoyalty(60)} />,
    );
    expect(container.querySelector('[data-wavering="sardis"]')).not.toBeNull();
  });

  it("does not pulse a glow on a city loyal to its owner", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={sardisLoyalty(-60)} />,
    );
    expect(container.querySelector('[data-wavering="sardis"]')).toBeNull();
  });

  it("labels the meter with a signed loyalty value for assistive tech", () => {
    render(<HexBoard map={CITED_CITY_MAP} units={[]} cities={sardisLoyalty(40)} />);
    expect(screen.getByRole("img", { name: "Sardis loyalty: +40" })).not.toBeNull();
  });
});

describe("HexBoard defection pulse", () => {
  it("pulses the hex of a just-defected city", () => {
    const { container } = render(
      <HexBoard
        map={CITED_CITY_MAP}
        units={[]}
        cities={persiaSardis(SARDIS_MAX)}
        defectionPulse={SARDIS_HEX}
      />,
    );
    expect(container.querySelector('[data-defection-pulse="0,0"]')).not.toBeNull();
  });

  it("shows no pulse when none is active", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={persiaSardis(SARDIS_MAX)} />,
    );
    expect(container.querySelector("[data-defection-pulse]")).toBeNull();
  });
});

describe("HexBoard city selection and incite", () => {
  it("selects a city for incitement when clicked with no unit selected", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={persiaSardis(SARDIS_MAX)} />,
    );
    fireEvent.click(container.querySelector('[data-hex="0,0"]')!);
    expect(container.querySelector('[data-city-selected="sardis"]')).not.toBeNull();
  });

  it("shows the city panel for the selected city", () => {
    const { container } = render(
      <HexBoard map={CITED_CITY_MAP} units={[]} cities={persiaSardis(SARDIS_MAX)} />,
    );
    fireEvent.click(container.querySelector('[data-hex="0,0"]')!);
    expect(screen.getByRole("region", { name: "Selected city" })).not.toBeNull();
  });

  it("incites the selected city through the panel when incite is available", () => {
    const onIncite = vi.fn();
    const { container } = render(
      <HexBoard
        map={CITED_CITY_MAP}
        units={[]}
        cities={persiaSardis(SARDIS_MAX)}
        canIncite
        onIncite={onIncite}
      />,
    );
    fireEvent.click(container.querySelector('[data-hex="0,0"]')!);
    fireEvent.click(screen.getByRole("button", { name: "Incite" }));
    expect(onIncite).toHaveBeenCalledWith("sardis");
  });

  it("disables incite in the panel when it is unavailable", () => {
    const { container } = render(
      <HexBoard
        map={CITED_CITY_MAP}
        units={[]}
        cities={persiaSardis(SARDIS_MAX)}
        canIncite={false}
      />,
    );
    fireEvent.click(container.querySelector('[data-hex="0,0"]')!);
    expect(screen.getByRole("button", { name: "Incite" })).toHaveProperty("disabled", true);
  });
});
