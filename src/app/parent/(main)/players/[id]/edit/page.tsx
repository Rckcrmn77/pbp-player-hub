import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PlayerForm } from "@/components/parent/player-form";
import { updatePlayer } from "@/lib/actions/parent";
import { getMyPlayer } from "@/lib/data/parent";

export const metadata: Metadata = { title: "Edit player" };

export default async function EditPlayerPage({ params }: PageProps<"/parent/players/[id]/edit">) {
  const { id } = await params;
  const player = await getMyPlayer(id);
  if (!player) notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Edit {player.first_name} {player.last_name}
      </h1>
      <PlayerForm
        action={updatePlayer.bind(null, player.id)}
        player={player}
        cancelHref={`/parent/players/${id}`}
      />
    </div>
  );
}
