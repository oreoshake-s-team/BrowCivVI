import Link from "next/link";
import { FIRST_SLICE_MAP, FIRST_SLICE_UNITS, FIRST_SLICE_REGIONS } from "@/content/firstSlice";
import { PlayBoard } from "@/components/board/PlayBoard";

export const metadata = {
  title: "Play — Conquests of Alexander",
};

export default function PlayPage() {
  return (
    <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <p>
        <Link href="/">← Home</Link>
      </p>
      <h1>The Granicus, 334 BC</h1>
      <p>
        Macedon (gold) crosses the Hellespont toward the Persian satraps (crimson) mustered at Zeleia.{" "}
        <strong>Left-click</strong> a unit to select it and reveal its reachable hexes;{" "}
        <strong>right-click</strong> a highlighted hex to move there.
      </p>
      <PlayBoard map={FIRST_SLICE_MAP} units={FIRST_SLICE_UNITS} regions={FIRST_SLICE_REGIONS} />
    </main>
  );
}
