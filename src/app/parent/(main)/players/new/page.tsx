import type { Metadata } from "next";

import { PlayerForm } from "@/components/parent/player-form";
import { createPlayer } from "@/lib/actions/parent";

export const metadata: Metadata = { title: "Add a player" };

export default function NewPlayerPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add a player</h1>
        <p className="mt-2 text-navy/80">
          Only you, other guardians you add through PBP, and the PBP coaches working with this player can see
          this profile.
        </p>
      </div>
      <PlayerForm action={createPlayer} cancelHref="/parent" />
    </div>
  );
}
