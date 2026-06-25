import Link from "next/link";
import { FIRST_SLICE_MAP, FIRST_SLICE_REGIONS } from "@/content/firstSlice";
import { PlayBoard } from "./PlayBoard";
import styles from "./PlayScreen.module.css";

export function PlayScreen({ initialMatchId }: { initialMatchId?: string | undefined }) {
  return (
    <main className={styles.main}>
      <div className={styles.topBar}>
        <h1 className={styles.heading}>The Granicus, 334 BC</h1>
        <Link href="/" className={styles.back}>
          ← Home
        </Link>
      </div>
      <details className={styles.intro}>
        <summary>How to play</summary>
        <p className={styles.introBody}>
          Macedon (gold) crosses the Hellespont toward the Persian satraps (crimson) mustered at
          Zeleia. <strong>Tap</strong> (or left-click) a unit to select it and reveal its reachable
          hexes, then <strong>tap or left-click a highlighted hex</strong> to move there
          (right-click also moves on desktop). Drag to pan; pinch or scroll the mouse wheel to zoom.
        </p>
      </details>
      <PlayBoard
        map={FIRST_SLICE_MAP}
        regions={FIRST_SLICE_REGIONS}
        initialMatchId={initialMatchId}
      />
    </main>
  );
}
