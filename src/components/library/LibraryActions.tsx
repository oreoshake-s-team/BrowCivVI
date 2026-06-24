"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteOldGames, startNewGame } from "./actions";
import styles from "./LibraryActions.module.css";

export interface LibraryActionsProps {
  readonly deletableCount: number;
}

export function LibraryActions({ deletableCount }: LibraryActionsProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const onNewGame = async () => {
    setBusy(true);
    try {
      const id = await startNewGame();
      router.push(`/play/${id}`);
    } catch {
      setBusy(false);
    }
  };

  const onConfirmDelete = async () => {
    setBusy(true);
    try {
      await deleteOldGames();
      setConfirming(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.actions}>
      <button
        type="button"
        className={styles.primary}
        disabled={busy}
        onClick={() => {
          void onNewGame();
        }}
      >
        Start new game
      </button>
      {deletableCount > 0 ? (
        confirming ? (
          <span className={styles.confirm}>
            <span>
              Delete {deletableCount} old {deletableCount === 1 ? "campaign" : "campaigns"}?
            </span>
            <button
              type="button"
              className={styles.danger}
              disabled={busy}
              onClick={() => {
                void onConfirmDelete();
              }}
            >
              Delete
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={busy}
              onClick={() => {
                setConfirming(false);
              }}
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={() => {
              setConfirming(true);
            }}
          >
            Delete all old games
          </button>
        )
      ) : null}
    </div>
  );
}
