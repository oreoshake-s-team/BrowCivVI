import Link from "next/link";
import type { MatchSummary } from "@/server/matchService";
import styles from "./GameLibrary.module.css";
import { formatRelativeTime } from "./relativeTime";

export interface GameLibraryProps {
  readonly games: readonly MatchSummary[];
  readonly now: number;
}

export function GameLibrary({ games, now }: GameLibraryProps) {
  if (games.length === 0) {
    return <p className={styles.emptyText}>No campaigns yet — start one above.</p>;
  }

  return (
    <ul className={styles.list}>
      {games.map((game) => (
        <li key={game.id}>
          <Link className={styles.row} href={`/play/${game.id}`}>
            <span className={styles.turn}>
              Turn {game.turn} / {game.turnLimit}
            </span>
            <span className={styles.score}>Score {game.score}</span>
            <span className={styles.played}>{formatRelativeTime(game.updatedAt, now)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
