import { PlayScreen } from "@/components/board/PlayScreen";

export const metadata = {
  title: "Play — Conquests of Alexander",
};

export const dynamic = "force-dynamic";

export default async function PlayMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlayScreen initialMatchId={id} />;
}
