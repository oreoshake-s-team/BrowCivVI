// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/play/actions";
import type { BoardView, MoveOutcome, SelectionTargets } from "@/app/play/actions";
import type { Hex } from "@/engine/hex";
import { hexToPixel } from "@/engine/map/layout";
import { SAMPLE_MAP, SAMPLE_UNITS } from "@/engine/map/sample";
import type { Unit } from "@/engine/unit/types";
import { PlayBoard } from "./PlayBoard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

vi.mock("@/app/play/actions", () => ({
  loadBoard: vi.fn(),
  newGame: vi.fn(),
  reachableFor: vi.fn(),
  targetsFor: vi.fn(),
  move: vi.fn(),
  attack: vi.fn(),
}));

const SIZE = 36;
const MATCH_ID = "match-1";
const MOVER = SAMPLE_UNITS[0]!;
const ORIGIN = MOVER.hex;
const DEST: Hex = { q: 1, r: 0 };
const REJECTED_MESSAGE = "Move rejected — the board changed. Try again.";

Element.prototype.setPointerCapture = () => undefined;
Element.prototype.releasePointerCapture = () => undefined;
Element.prototype.hasPointerCapture = () => false;

function transformFor(hex: Hex): string {
  const center = hexToPixel(hex, SIZE);
  return `translate(${center.x}, ${center.y})`;
}

function tokenTransform(container: HTMLElement, unitId: string): string | null {
  return container.querySelector(`[data-unit-id="${unitId}"]`)?.getAttribute("transform") ?? null;
}

async function selectMoverAndTargetDest(container: HTMLElement): Promise<void> {
  const token = await screen.findByRole("button", { name: /Pezhetairos \(macedon\)/ });
  fireEvent.click(token);
  await waitFor(() => {
    expect(container.querySelector(".reach")).not.toBeNull();
  });
  const destHex = container.querySelector('[data-hex="1,0"]');
  fireEvent.contextMenu(destHex!);
}

describe("PlayBoard intent flow against mocked Server Actions", () => {
  beforeEach(() => {
    vi.mocked(actions.loadBoard).mockResolvedValue({
      matchId: MATCH_ID,
      units: SAMPLE_UNITS,
    } satisfies BoardView);
    vi.mocked(actions.targetsFor).mockResolvedValue({
      reachable: [DEST],
      attackable: [],
    } satisfies SelectionTargets);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("selects a unit, sends the move intent, and renders the authoritative result", async () => {
    const movedUnits: readonly Unit[] = SAMPLE_UNITS.map((unit) =>
      unit.id === MOVER.id ? { ...unit, hex: DEST } : unit,
    );
    vi.mocked(actions.move).mockResolvedValue({
      ok: true,
      units: movedUnits,
      reachable: [],
    } satisfies MoveOutcome);

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    await selectMoverAndTargetDest(container);

    await waitFor(() => {
      expect(tokenTransform(container, MOVER.id)).toBe(transformFor(DEST));
    });
    expect(actions.move).toHaveBeenCalledWith(MATCH_ID, MOVER.id, DEST);
    expect(actions.targetsFor).toHaveBeenCalledWith(MATCH_ID, MOVER.id);
    expect(container.querySelector(".reach")).toBeNull();
    expect(screen.queryByText(REJECTED_MESSAGE)).toBeNull();
  });

  it("reverts the optimistic move and surfaces a retry toast when the server rejects it", async () => {
    vi.mocked(actions.move).mockResolvedValue({
      ok: false,
      units: SAMPLE_UNITS,
      reachable: [],
    } satisfies MoveOutcome);

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    await selectMoverAndTargetDest(container);

    expect(await screen.findByText(REJECTED_MESSAGE)).not.toBeNull();
    expect(tokenTransform(container, MOVER.id)).toBe(transformFor(ORIGIN));
  });
});
