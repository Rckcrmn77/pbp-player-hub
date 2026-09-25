import Link from "next/link";

import { ageGroupOptions, labelFor, positionOptions, programOptions } from "@/config/player-options";
import { enrollmentStatusOptions } from "@/config/program-options";
import type { ConsentStatus } from "@/lib/consent";
import type { BlueprintSummary, PlayerProgram } from "@/lib/data/parent";
import type { PlayerRow, ProgressReportRow } from "@/lib/supabase/types";

export function PlayerCard({
  player,
  consent,
  programs = [],
  blueprint,
  checkedInThisWeek,
  latestReport,
}: {
  player: PlayerRow;
  consent: ConsentStatus;
  programs?: PlayerProgram[];
  blueprint?: BlueprintSummary;
  /** Undefined when the player has no active Blueprint (no check-ins due). */
  checkedInThisWeek?: boolean;
  latestReport?: ProgressReportRow;
}) {
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
      {programs.length > 0 && (
        <ul className="flex flex-col gap-1 text-sm">
          {programs.map((p) => (
            <li key={p.enrollmentId}>
              <span className="font-medium">{p.programName}</span>
              <span className="text-navy/70">
                {" "}
                · {enrollmentStatusOptions.find((o) => o.value === p.status)?.label}
              </span>
            </li>
          ))}
        </ul>
      )}
      {blueprint && (
        <div className="rounded-md bg-carolina-light px-3 py-2 text-sm">
          <p className="font-semibold">Blueprint active</p>
          {blueprint.topPriority && <p>Top priority: {blueprint.topPriority}</p>}
          <p className="text-navy/70">
            {blueprint.drillCount} drill{blueprint.drillCount === 1 ? "" : "s"} assigned
          </p>
        </div>
      )}
      {checkedInThisWeek !== undefined &&
        (checkedInThisWeek ? (
          <p className="text-sm text-navy/70">This week&apos;s check-in is done.</p>
        ) : (
          <Link
            href={`/parent/players/${player.id}/check-in`}
            className="self-start rounded-md bg-orange px-3 py-2 text-sm font-semibold text-white hover:bg-orange-dark"
          >
            Check in for this week
          </Link>
        ))}
      {latestReport && (
        <Link
          href={`/parent/players/${player.id}/reports/${latestReport.id}`}
          className="text-sm font-semibold text-carolina-dark underline"
        >
          Latest progress report
        </Link>
      )}
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
