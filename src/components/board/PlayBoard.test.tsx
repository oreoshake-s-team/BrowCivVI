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
import { cityMaxHp, type CityState } from "@/engine/match/cities";
import type {
  AttackEvent,
  CaptureEvent,
  CityAttackEvent,
  DefectionEvent,
  MatchEvent,
} from "@/engine/match/events";
import type { Unit } from "@/engine/unit/types";
import { PlayBoard } from "./PlayBoard";
import { REPLAY_TIMING } from "./usePlayBoard";

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
  attackCity: vi.fn(),
  endTurn: vi.fn(),
  resolveDivergence: vi.fn(),
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
const CITY_ID = "dascylium";
const CITY_HEX: Hex = { q: 3, r: 1 };
const CITIES_VIEW: readonly CityState[] = [{ id: CITY_ID, owner: "persia", hp: cityMaxHp(20) }];
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
        cities: CITIES_VIEW,
        turn: 1,
        activeFaction: "macedon",
        events: [],
        scorched: [],
        canIncite: false,
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
    expect(container.querySelector(".reach")).not.toBeNull();
    expect(container.querySelector(`[data-attack-target="${DEFENDER.id}"]`)).not.toBeNull();
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

  it("sends a city-attack intent and logs the siege end to end", async () => {
    vi.mocked(actions.targetsFor).mockResolvedValue({
      reachable: [DEST],
      attackable: [CITY_HEX],
    } satisfies SelectionTargets);
    const siege: CityAttackEvent = {
      kind: "cityAttack",
      seq: 0,
      turn: 1,
      faction: "macedon",
      unitId: MOVER.id,
      unitTypeId: MOVER.typeId,
      cityId: CITY_ID,
      cityDamage: 30,
      retaliation: 6,
      cityFell: false,
    };
    vi.mocked(actions.attackCity).mockResolvedValue({
      ok: true,
      units: SAMPLE_UNITS,
      cities: CITIES_VIEW,
      attackerHex: ORIGIN,
      cityHex: CITY_HEX,
      cityDamage: 30,
      attackerDamage: 6,
      cityFell: false,
      movement: NO_MOVEMENT,
      events: [siege],
    });

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: /Pezhetairos \(macedon\)/ }));
    const overlay = await waitFor(() => {
      const el = container.querySelector(`[data-city-attack="${CITY_ID}"]`);
      if (el === null) throw new Error("city attack target not offered");
      return el;
    });
    fireEvent.click(overlay);

    expect(await screen.findByText(/besieged Dascylium — dealt 30, took 6/)).not.toBeNull();
    expect(actions.attackCity).toHaveBeenCalledWith(MATCH_ID, MOVER.id, CITY_ID);
  });

  it("logs a capture when a unit moves onto a fallen city", async () => {
    vi.mocked(actions.targetsFor).mockResolvedValue({
      reachable: [CITY_HEX],
      attackable: [],
    } satisfies SelectionTargets);
    const capture: CaptureEvent = {
      kind: "capture",
      seq: 0,
      turn: 1,
      faction: "macedon",
      unitId: MOVER.id,
      unitTypeId: MOVER.typeId,
      cityId: CITY_ID,
      previousOwner: "persia",
    };
    const movedUnits: readonly Unit[] = SAMPLE_UNITS.map((unit) =>
      unit.id === MOVER.id ? { ...unit, hex: CITY_HEX } : unit,
    );
    vi.mocked(actions.move).mockResolvedValue({
      ok: true,
      units: movedUnits,
      reachable: [],
      movement: NO_MOVEMENT,
      events: [capture],
      cities: [{ id: CITY_ID, owner: "macedon", hp: 80 }],
    } satisfies MoveOutcome);

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    await selectMover(container);
    fireEvent.contextMenu(container.querySelector('[data-hex="3,1"]')!);

    expect(await screen.findByText(/captured Dascylium from Persia/)).not.toBeNull();
  });

  it("keeps a hit-and-run attacker selected and refreshes its targets when it retains movement", async () => {
    vi.mocked(actions.attack).mockResolvedValue({
      ok: true,
      units: SAMPLE_UNITS,
      attackerHex: ORIGIN,
      defenderHex: ENEMY_HEX,
      attackerDamage: 6,
      defenderDamage: 18,
      movement: { [MOVER.id]: 1 },
    } satisfies AttackOutcome);

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    await selectMover(container);
    fireEvent.contextMenu(container.querySelector(`[data-unit-id="${DEFENDER.id}"]`)!);

    await waitFor(() => {
      expect(actions.targetsFor).toHaveBeenCalledTimes(2);
    });
    expect(container.querySelector(".reach")).not.toBeNull();
    expect(container.querySelector(`[data-attack-target="${DEFENDER.id}"]`)).not.toBeNull();
    expect(screen.queryByLabelText("Selected unit")).not.toBeNull();
  });

  it("auto-deselects a unit that spends all movement with no adjacent enemy after moving", async () => {
    vi.mocked(actions.targetsFor)
      .mockReset()
      .mockResolvedValueOnce({ reachable: [DEST], attackable: [ENEMY_HEX] })
      .mockResolvedValue({ reachable: [], attackable: [] });
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
      expect(screen.queryByLabelText("Selected unit")).toBeNull();
    });
    expect(container.querySelector(".reach")).toBeNull();
  });

  it("auto-deselects a non-hit-and-run attacker whose movement is spent with no further targets", async () => {
    vi.mocked(actions.targetsFor)
      .mockReset()
      .mockResolvedValueOnce({ reachable: [DEST], attackable: [ENEMY_HEX] })
      .mockResolvedValue({ reachable: [], attackable: [] });
    vi.mocked(actions.attack).mockResolvedValue({
      ok: true,
      units: [MOVER],
      attackerHex: ORIGIN,
      defenderHex: ENEMY_HEX,
      attackerDamage: 9,
      defenderDamage: 30,
      defeated: [DEFENDER.id],
      movement: NO_MOVEMENT,
    } satisfies AttackOutcome);

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    await selectMover(container);
    fireEvent.contextMenu(container.querySelector(`[data-unit-id="${DEFENDER.id}"]`)!);

    await waitFor(() => {
      expect(screen.queryByLabelText("Selected unit")).toBeNull();
    });
    expect(container.querySelector(".reach")).toBeNull();
  });

  it("starts a new game and routes to the new match", async () => {
    vi.mocked(actions.newGame).mockResolvedValue({
      matchId: NEW_MATCH_ID,
      units: SAMPLE_UNITS,
      movement: NO_MOVEMENT,
      playerFaction: "macedon",
      cities: CITIES_VIEW,
      turn: 1,
      activeFaction: "macedon",
      events: [],
      scorched: [],
      canIncite: false,
    } satisfies BoardView);

    render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "New game" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() => {
      expect(actions.newGame).toHaveBeenCalled();
    });
    expect(pushMock).toHaveBeenCalledWith(`/play/${NEW_MATCH_ID}`);
  });

  it("prompts a new game for a match saved before city capture, then starts fresh", async () => {
    vi.mocked(actions.loadBoard).mockResolvedValue({
      status: "ok",
      board: {
        matchId: MATCH_ID,
        units: SAMPLE_UNITS,
        movement: NO_MOVEMENT,
        playerFaction: "macedon",
        cities: [],
        turn: 7,
        activeFaction: "macedon",
        events: [],
        scorched: [],
        canIncite: false,
        incompatible: true,
      },
    } satisfies LoadBoardResult);
    vi.mocked(actions.newGame).mockResolvedValue({
      matchId: NEW_MATCH_ID,
      units: SAMPLE_UNITS,
      movement: NO_MOVEMENT,
      playerFaction: "macedon",
      cities: CITIES_VIEW,
      turn: 1,
      activeFaction: "macedon",
      events: [],
      scorched: [],
      canIncite: false,
    } satisfies BoardView);

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "Start new game" }));

    expect(container.querySelector("svg")).toBeNull();
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
          cities: CITIES_VIEW,
          turn: 1,
          activeFaction: "macedon",
          events: [],
          scorched: [],
          canIncite: false,
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
      cities: CITIES_VIEW,
      turn: 2,
      activeFaction: "macedon",
      events: [],
      scorched: [],
      canIncite: false,
    } satisfies BoardView);
    render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "End turn" }));
    expect(actions.endTurn).toHaveBeenCalledWith(MATCH_ID);
    expect(await screen.findByText("Turn 2")).not.toBeNull();
  });

  it("replays the AI's attacks and returns control once the sequence finishes", async () => {
    const originalTiming = { ...REPLAY_TIMING };
    REPLAY_TIMING.panMs = 0;
    REPLAY_TIMING.holdMs = 0;
    const aiAttack: AttackEvent = {
      kind: "attack",
      seq: 0,
      turn: 1,
      faction: "persia",
      unitId: DEFENDER.id,
      unitTypeId: DEFENDER.typeId,
      attackerHex: ENEMY_HEX,
      targetId: MOVER.id,
      targetTypeId: MOVER.typeId,
      targetHex: ORIGIN,
      attackerDamage: 7,
      defenderDamage: 30,
      defeated: [],
    };
    vi.mocked(actions.endTurn).mockResolvedValue({
      matchId: MATCH_ID,
      units: SAMPLE_UNITS,
      movement: NO_MOVEMENT,
      playerFaction: "macedon",
      cities: CITIES_VIEW,
      turn: 2,
      activeFaction: "macedon",
      events: [aiAttack],
      scorched: [],
      canIncite: false,
    } satisfies BoardView);

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "End turn" }));
    expect(screen.getByRole("button", { name: "Ending…" })).toHaveProperty("disabled", true);

    expect(await screen.findByText("-30")).not.toBeNull();
    await waitFor(() => {
      expect(screen.getByText("Turn 2")).not.toBeNull();
    });
    expect(screen.getByRole("button", { name: "End turn" })).toHaveProperty("disabled", false);
    expect(container.querySelector("[data-pan-target]")).toBeNull();

    Object.assign(REPLAY_TIMING, originalTiming);
  });

  it("returns control immediately when the AI's turn produced no attacks", async () => {
    const originalTiming = { ...REPLAY_TIMING };
    REPLAY_TIMING.panMs = 0;
    REPLAY_TIMING.holdMs = 0;
    const aiMove: MatchEvent = {
      kind: "move",
      seq: 0,
      turn: 1,
      faction: "persia",
      unitId: DEFENDER.id,
      unitTypeId: DEFENDER.typeId,
      from: ENEMY_HEX,
      to: { q: ENEMY_HEX.q, r: ENEMY_HEX.r + 1 },
    };
    vi.mocked(actions.endTurn).mockResolvedValue({
      matchId: MATCH_ID,
      units: SAMPLE_UNITS,
      movement: NO_MOVEMENT,
      playerFaction: "macedon",
      cities: CITIES_VIEW,
      turn: 2,
      activeFaction: "macedon",
      events: [aiMove],
      scorched: [],
      canIncite: false,
    } satisfies BoardView);

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "End turn" }));

    expect(await screen.findByText("Turn 2")).not.toBeNull();
    expect(screen.getByRole("button", { name: "End turn" })).toHaveProperty("disabled", false);
    expect(container.querySelector("[data-pan-target]")).toBeNull();

    Object.assign(REPLAY_TIMING, originalTiming);
  });

  it("replays a city defection and reflects the new owner once it resolves", async () => {
    const originalTiming = { ...REPLAY_TIMING };
    REPLAY_TIMING.panMs = 0;
    REPLAY_TIMING.holdMs = 0;
    const defection: DefectionEvent = {
      kind: "defection",
      seq: 0,
      turn: 1,
      faction: "macedon",
      cityId: CITY_ID,
      hex: { q: 3, r: 1 },
      previousOwner: "persia",
    };
    vi.mocked(actions.endTurn).mockResolvedValue({
      matchId: MATCH_ID,
      units: SAMPLE_UNITS,
      movement: NO_MOVEMENT,
      playerFaction: "macedon",
      cities: [{ id: CITY_ID, owner: "macedon", hp: cityMaxHp(20) }],
      turn: 2,
      activeFaction: "macedon",
      events: [defection],
      scorched: [],
      canIncite: false,
    } satisfies BoardView);

    const { container } = render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "End turn" }));
    await waitFor(() => {
      expect(screen.getByText("Turn 2")).not.toBeNull();
    });
    expect(
      container.querySelector('[data-city-tint="dascylium"]')?.getAttribute("style"),
    ).toContain("--faction-macedon-fill");

    Object.assign(REPLAY_TIMING, originalTiming);
  });

  it("asks to confirm before ending the turn with a unit that still has moves", async () => {
    vi.mocked(actions.loadBoard).mockResolvedValue({
      status: "ok",
      board: {
        matchId: MATCH_ID,
        units: SAMPLE_UNITS,
        movement: { [MOVER.id]: 2 },
        playerFaction: "macedon",
        cities: CITIES_VIEW,
        turn: 1,
        activeFaction: "macedon",
        events: [],
        scorched: [],
        canIncite: false,
      },
    } satisfies LoadBoardResult);
    render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: "End turn" }));
    expect(await screen.findByText(/units still to act/)).not.toBeNull();
    expect(actions.endTurn).not.toHaveBeenCalled();
  });
});

describe("PlayBoard divergence node", () => {
  const NODE = {
    id: "granicus",
    title: "The Granicus, 334 BC",
    prompt: "The Persian horse line the far bank.",
    advisor: "Parmenion",
    options: [
      {
        id: "reckless",
        label: "Attack at once",
        quote: "I would not hazard the crossing.",
        outcome: "Cleitus the Black saves Alexander.",
      },
      {
        id: "cautious",
        label: "Cross at dawn",
        quote: "Cross at first light, in order.",
        outcome: "The army crosses in order.",
      },
    ],
    citation: {
      claim: "Arrian I.13-16.",
      source: { title: "Arrian, Anabasis", url: "https://example.test", type: "primary" as const },
      confidence: "high" as const,
    },
    media: [
      {
        id: "g1",
        title: "Granicus (Kings and Generals)",
        url: "https://example.test/v",
        kind: "video" as const,
      },
    ],
  };
  const BOARD = {
    matchId: MATCH_ID,
    units: SAMPLE_UNITS,
    movement: NO_MOVEMENT,
    playerFaction: "macedon",
    cities: CITIES_VIEW,
    turn: 1,
    activeFaction: "macedon",
    events: [],
    scorched: [],
    canIncite: false,
  };

  beforeEach(() => {
    vi.mocked(actions.loadBoard).mockResolvedValue({
      status: "ok",
      board: { ...BOARD, pendingDivergence: NODE },
    } satisfies LoadBoardResult);
    vi.mocked(actions.resolveDivergence).mockResolvedValue({ ok: true, board: BOARD });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("presents the dilemma as a modal dialog", async () => {
    render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    expect(await screen.findByRole("dialog", { name: /The Granicus/ })).not.toBeNull();
  });

  it("reveals the outcome on choosing, then resolves on continue", async () => {
    render(<PlayBoard map={SAMPLE_MAP} initialMatchId={MATCH_ID} />);
    fireEvent.click(await screen.findByRole("button", { name: /Attack at once/ }));
    expect(await screen.findByText(/Cleitus the Black saves Alexander/)).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => {
      expect(actions.resolveDivergence).toHaveBeenCalledWith(MATCH_ID, "granicus", "reckless");
    });
  });
});
