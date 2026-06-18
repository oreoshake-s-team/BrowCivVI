import Link from "next/link";
import { FIRST_SLICE_MAP, FIRST_SLICE_UNITS, FIRST_SLICE_REGIONS } from "@/content/firstSlice";
import { HexBoard } from "@/components/board/HexBoard";

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
        From Sparta in the south Peloponnese, across the Aegean, to the Persian satraps (crimson) mustered at
        Zeleia: Macedon (gold) crosses the Hellespont to open the campaign. Click a unit to inspect it.
      </p>
      <HexBoard map={FIRST_SLICE_MAP} units={FIRST_SLICE_UNITS} regions={FIRST_SLICE_REGIONS} />
    </main>
  );
}
