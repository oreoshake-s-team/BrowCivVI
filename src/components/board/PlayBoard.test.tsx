// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as actions from "@/app/play/actions";
import type {
  BoardView,
  LoadBoardResult,
  MoveOutcome,
  AttackOutcome,
  SelectionTargets,
} from "@/app/play/actions";
import type { Hex } from "@/engine/hex";
import { hexToPixel } from "@/engine/map/layout";
import { SAMPLE_MAP, SAMPLE_UNITS } from "@/engine/map/sample";
import type { Unit } from "@/engine/unit/types";
import { PlayBoard } from "./PlayBoard";

const { pushMock, replaceMock } = vi.hoisted(() => ({ pushMock: vi.fn(), replaceMock: vi.fn() }));

vi.mock("next/navigation", () => {
  const router = { replace: replaceMock, push: pushMock };
  return { useRouter: () => router };
});

vi.mock("@/app/play/actions", () => ({
  loadBoard: vi.fn(),
  newGame: vi.fn(),
  reachableFor: vi.fn(),
  targetsFor: vi.fn(),
  move: vi.fn(),
  attack: vi.fn(),
  endTurn: vi.fn(),
}));

const SIZE = 36;
const MATCH_ID = "match-1";
const NEW_MATCH_ID = "match-2";
const MOVER = SAMPLE_UNITS[0]!;
const DEFENDER = SAMPLE_UNITS[1]!;
const ORIGIN = MOVER.hex;
const ENEMY_HEX = DEFENDER.hex;
const DEST: Hex = { q: 1, r: 0 };
const NO_MOVEMENT: Readonly<Record<string, number>> = {};
const MOVE_REJECTED = "Move rejected — the board changed. Try again.";
const ATTACK_REJECTED = "Attack rejected — the board changed. Try again.";
const RATE_LIMITED = "You're acting too fast — give it a moment and try again.";

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

async function selectMover(container: HTMLElement): Promise<void> {
  const token = await screen.findByRole("button", { name: /Pezhetairos \(macedon\)/ });
  fireEvent.click(token);
  await waitFor(() => {
    expect(container.querySelector(".reach")).not.toBeNull();
  });
}

describe("PlayBoard intent flow against mocked Server Actions", () => {
  beforeEach(() => {
    vi.mocked(actions.loadBoard).mockResolvedValue({
      status: "ok",
      board: {
        matchId: MATCH_ID,
        units: SAMPLE_UNITS,
        movement: NO_MOVEMENT,
        playerFaction: "macedon",
        turn: 1,
        activeFaction: "macedon",
      },
    } satisfies LoadBoardResult);
    vi.mocked(actions.targetsFor).mockResolvedValue({
      reachable: [DEST],
      attackable: [ENEMY_HEX],
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
      movement: NO_MOVEMENT,
    } satisfies MoveOutcome);

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    await selectMover(container);
    fireEvent.contextMenu(container.querySelector('[data-hex="1,0"]')!);

    await waitFor(() => {
      expect(tokenTransform(container, MOVER.id)).toBe(transformFor(DEST));
    });
    expect(actions.move).toHaveBeenCalledWith(MATCH_ID, MOVER.id, DEST);
    expect(actions.targetsFor).toHaveBeenCalledWith(MATCH_ID, MOVER.id);
    expect(container.querySelector(".reach")).toBeNull();
    expect(screen.queryByText(MOVE_REJECTED)).toBeNull();
  });

  it("reverts the optimistic move and surfaces a retry toast when the server rejects it", async () => {
    vi.mocked(actions.move).mockResolvedValue({
      ok: false,
      units: SAMPLE_UNITS,
      reachable: [],
      movement: NO_MOVEMENT,
    } satisfies MoveOutcome);

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    await selectMover(container);
    fireEvent.contextMenu(container.querySelector('[data-hex="1,0"]')!);

    expect(await screen.findByText(MOVE_REJECTED)).not.toBeNull();
    expect(tokenTransform(container, MOVER.id)).toBe(transformFor(ORIGIN));
  });

  it("surfaces a rate-limit toast when a move intent is throttled", async () => {
    vi.mocked(actions.move).mockResolvedValue({
      ok: false,
      units: SAMPLE_UNITS,
      reachable: [],
      movement: NO_MOVEMENT,
      rateLimited: true,
    } satisfies MoveOutcome);

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    await selectMover(container);
    fireEvent.contextMenu(container.querySelector('[data-hex="1,0"]')!);

    expect(await screen.findByText(RATE_LIMITED)).not.toBeNull();
    expect(screen.queryByText(MOVE_REJECTED)).toBeNull();
  });

  it("sends the attack intent, floats damage, and fades the defeated defender", async () => {
    vi.mocked(actions.attack).mockResolvedValue({
      ok: true,
      units: [MOVER],
      attackerHex: ORIGIN,
      defenderHex: ENEMY_HEX,
      attackerDamage: 12,
      defenderDamage: 25,
      defeated: [DEFENDER.id],
      movement: NO_MOVEMENT,
    } satisfies AttackOutcome);

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    await selectMover(container);
    fireEvent.contextMenu(container.querySelector(`[data-unit-id="${DEFENDER.id}"]`)!);

    expect(await screen.findByText("-25")).not.toBeNull();
    expect(actions.attack).toHaveBeenCalledWith(MATCH_ID, MOVER.id, DEFENDER.id);
    expect(container.querySelector(`[data-fading-id="${DEFENDER.id}"]`)).not.toBeNull();
    expect(screen.queryByText(ATTACK_REJECTED)).toBeNull();
  });

  it("surfaces a retry toast when the server rejects the attack", async () => {
    vi.mocked(actions.attack).mockResolvedValue({
      ok: false,
      units: SAMPLE_UNITS,
    } satisfies AttackOutcome);

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    await selectMover(container);
    fireEvent.contextMenu(container.querySelector(`[data-unit-id="${DEFENDER.id}"]`)!);

    expect(await screen.findByText(ATTACK_REJECTED)).not.toBeNull();
    expect(container.querySelector(`[data-unit-id="${DEFENDER.id}"]`)).not.toBeNull();
  });

  it("starts a new game and routes to the new match", async () => {
    vi.mocked(actions.newGame).mockResolvedValue({
      matchId: NEW_MATCH_ID,
      units: SAMPLE_UNITS,
      movement: NO_MOVEMENT,
      playerFaction: "macedon",
      turn: 1,
      activeFaction: "macedon",
    } satisfies BoardView);

    render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "New game" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => {
      expect(actions.newGame).toHaveBeenCalled();
    });
    expect(pushMock).toHaveBeenCalledWith(`/play/${NEW_MATCH_ID}`);
  });

  it("shows the load-error state and recovers when the load is retried", async () => {
    vi.mocked(actions.loadBoard)
      .mockReset()
      .mockRejectedValueOnce(new Error("load failed"))
      .mockResolvedValue({
        status: "ok",
        board: {
          matchId: MATCH_ID,
          units: SAMPLE_UNITS,
          movement: NO_MOVEMENT,
          playerFaction: "macedon",
          turn: 1,
          activeFaction: "macedon",
        },
      } satisfies LoadBoardResult);

    render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry" }));

    expect(await screen.findByRole("button", { name: /Pezhetairos \(macedon\)/ })).not.toBeNull();
  });

  it("shows the not-found state for an unknown campaign", async () => {
    vi.mocked(actions.loadBoard)
      .mockReset()
      .mockResolvedValue({ status: "not-found" } satisfies LoadBoardResult);

    render(<PlayBoard map={SAMPLE_MAP} initialMatchId="ghost" />);

    expect(await screen.findByText(/faded from the annals/)).not.toBeNull();
  });

  it("shows the current turn number and active faction", async () => {
    render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    expect(await screen.findByText("Turn 1")).not.toBeNull();
    expect(await screen.findByText("Macedon")).not.toBeNull();
  });

  it("ends the turn and advances the bar when no unit has moves left", async () => {
    vi.mocked(actions.endTurn).mockResolvedValue({
      matchId: MATCH_ID,
      units: SAMPLE_UNITS,
      movement: NO_MOVEMENT,
      playerFaction: "macedon",
      turn: 2,
      activeFaction: "macedon",
    } satisfies BoardView);
    render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "End turn" }));
    expect(actions.endTurn).toHaveBeenCalledWith(MATCH_ID);
    expect(await screen.findByText("Turn 2")).not.toBeNull();
  });

  it("asks to confirm before ending the turn with a unit that still has moves", async () => {
    vi.mocked(actions.loadBoard).mockResolvedValue({
      status: "ok",
      board: {
        matchId: MATCH_ID,
        units: SAMPLE_UNITS,
        movement: { [MOVER.id]: 2 },
        playerFaction: "macedon",
        turn: 1,
        activeFaction: "macedon",
      },
    } satisfies LoadBoardResult);
    render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "End turn" }));
    expect(await screen.findByText(/units still to act/)).not.toBeNull();
    expect(actions.endTurn).not.toHaveBeenCalled();
  });
});
