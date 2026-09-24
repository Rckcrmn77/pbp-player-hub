import Link from "next/link";

import { ageGroupOptions, labelFor, positionOptions, programOptions } from "@/config/player-options";
import type { ConsentStatus } from "@/lib/consent";
import type { PlayerRow } from "@/lib/supabase/types";

export function PlayerCard({ player, consent }: { player: PlayerRow; consent: ConsentStatus }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-xl border border-navy/10 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">
            {player.first_name} {player.last_name}
          </h3>
          <p className="text-sm text-navy/70">
            Class of {player.graduation_year} · {labelFor(programOptions, player.program)}
          </p>
        </div>
        <span className="rounded-full bg-carolina-light px-2.5 py-1 text-xs font-semibold whitespace-nowrap">
          {labelFor(positionOptions, player.primary_position)}
        </span>
      </div>
      <p className="text-sm text-navy/70">{labelFor(ageGroupOptions, player.age_group)}</p>
      {consent !== "granted" && (
        <p className="rounded-md bg-orange/10 px-3 py-2 text-sm font-medium text-orange-dark">
          Parental consent needed.{" "}
          <Link href="/parent/consent" className="underline">
            Review consent
          </Link>
        </p>
      )}
      <div className="mt-auto flex gap-4 pt-1 text-sm font-semibold">
        <Link href={`/parent/players/${player.id}`} className="text-carolina-dark underline">
          View profile
        </Link>
        <Link href={`/parent/players/${player.id}/edit`} className="text-carolina-dark underline">
          Edit
        </Link>
      </div>
    </article>
  );
}
