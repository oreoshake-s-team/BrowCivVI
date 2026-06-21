"use client";

import type { NamedRegion } from "@/engine/content/region";
import type { GameMap } from "@/engine/map/types";
import { BoardLoadError } from "./BoardLoadError";
import { HexBoard } from "./HexBoard";
import styles from "./PlayBoard.module.css";
import { Toast } from "./Toast";
import { usePlayBoard } from "./usePlayBoard";

function factionLabel(faction: string): string {
  return faction.length === 0 ? "" : faction.charAt(0).toUpperCase() + faction.slice(1);
}

export interface PlayBoardProps {
  readonly map: GameMap;
  readonly regions?: readonly NamedRegion[];
  readonly initialMatchId?: string | undefined;
}

export function PlayBoard({ map, regions = [], initialMatchId }: PlayBoardProps) {
  const board = usePlayBoard(initialMatchId);
  const { state } = board;

  if (state.loadError !== null) {
    return <BoardLoadError reason={state.loadError} onRetry={board.retry} />;
  }
  if (!state.ready) return <p role="status">Loading the campaign…</p>;

  return (
    <>
      <div className={styles.controls}>
        <span className={styles.turnInfo}>
          <span className={styles.turnNumber}>Turn {state.turn}</span>
          <span className={styles.activeFaction}>
            <span
              className={styles.factionDot}
              data-faction={state.activeFaction}
              aria-hidden="true"
            />
            {factionLabel(state.activeFaction)}
          </span>
        </span>
        {state.confirmingEnd ? (
          <span className={styles.confirm}>
            End turn with units still to act?
            <button type="button" onClick={board.confirmEndTurn}>
              End turn
            </button>
            <button type="button" onClick={board.cancelEndTurn}>
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" onClick={board.requestEndTurn} disabled={!board.canEndTurn}>
            {state.endingTurn ? "Ending…" : "End turn"}
          </button>
        )}
        {state.confirmingNewGame ? (
          <span className={styles.confirm}>
            Start a new game?
            <button type="button" onClick={board.confirmNewGame}>
              Yes
            </button>
            <button type="button" onClick={board.cancelNewGame}>
              Cancel
            </button>
          </span>
        ) : (
          <button type="button" onClick={board.requestNewGame}>
            New game
          </button>
        )}
      </div>
      <HexBoard
        map={map}
        units={state.units}
        regions={regions}
        movement={state.movement}
        playerFaction={state.playerFaction}
        reachable={state.reachable}
        attackable={state.attackable}
        deselectSignal={state.deselectSignal}
        floaters={state.floaters}
        fadingUnits={state.fadingUnits}
        events={state.events}
        panTarget={state.panTarget}
        onSelect={board.select}
        onMove={board.moveUnit}
        onAttack={board.attackUnit}
      />
      {state.toast !== null ? <Toast message={state.toast} onDismiss={board.dismissToast} /> : null}
    </>
  );
}
