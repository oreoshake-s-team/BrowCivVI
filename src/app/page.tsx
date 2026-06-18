import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: "640px", margin: "0 auto", padding: "3rem 1.5rem" }}>
      <h1>Conquests of Alexander</h1>
      <p>334 BC — the army musters at the Granicus.</p>
      <p>
        <Link href="/play">Enter the campaign →</Link>
      </p>
    </main>
  );
}
