import Link from "next/link";
import { FIRST_SLICE_MAP, FIRST_SLICE_UNITS } from "@/content/firstSlice";
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
        Macedon (gold) crosses the Hellespont to face the Persian satraps (crimson) mustered at Zeleia, from
        Pella west to Ionia in the south. Click a unit to inspect it.
      </p>
      <HexBoard map={FIRST_SLICE_MAP} units={FIRST_SLICE_UNITS} />
    </main>
  );
}
