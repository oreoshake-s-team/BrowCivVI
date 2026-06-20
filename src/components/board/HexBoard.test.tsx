// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import type { Citation } from "@/engine/content/citation";
import type { NamedRegion } from "@/engine/content/region";
import { SAMPLE_MAP, SAMPLE_UNITS } from "@/engine/map/sample";
import { createGameMap } from "@/engine/map/types";
import { unitTypeById } from "@/engine/unit/catalog";
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
});
