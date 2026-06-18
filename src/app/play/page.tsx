import Link from "next/link";
import { SAMPLE_MAP, SAMPLE_UNITS } from "@/engine/map/sample";
import { HexBoard } from "@/components/board/HexBoard";

export const metadata = {
  title: "Play — Conquests of Alexander",
};

export default function PlayPage() {
  return (
    <main style={{ maxWidth: "1080px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      <p>
        <Link href="/">← Home</Link>
      </p>
      <h1>The Granicus, 334 BC</h1>
      <p>Macedon (gold) faces the Persian satraps (crimson) across the river. Click a unit to inspect it.</p>
      <HexBoard map={SAMPLE_MAP} units={SAMPLE_UNITS} />
    </main>
  );
}
