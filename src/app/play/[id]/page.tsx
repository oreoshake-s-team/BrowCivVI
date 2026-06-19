import { PlayScreen } from "@/components/board/PlayScreen";
import { requirePlayAccess } from "../authGate";

export const metadata = {
  title: "Play — Conquests of Alexander",
};

export const dynamic = "force-dynamic";

export default async function PlayMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePlayAccess(`/play/${id}`);
  return <PlayScreen initialMatchId={id} />;
}
