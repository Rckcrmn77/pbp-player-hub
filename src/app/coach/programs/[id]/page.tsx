import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SessionList } from "@/components/coach/session-list";
import { StatusPill } from "@/components/status-pill";
import { experienceOptions, labelFor, positionOptions } from "@/config/player-options";
import { enrollmentStatusOptions, onRosterStatuses } from "@/config/program-options";
import { getAttendanceForSessions, getProgram, getProgramSessions, getRoster } from "@/lib/data/staff";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Program roster" };

export default async function CoachProgramPage({ params }: PageProps<"/coach/programs/[id]">) {
  const { id } = await params;
  const program = await getProgram(id);
  if (!program) notFound();

  const [roster, sessions] = await Promise.all([getRoster(id), getProgramSessions(id)]);
  const attendance = await getAttendanceForSessions(sessions.map((s) => s.id));
  const marked = new Map<string, number>();
  for (const a of attendance) marked.set(a.session_id, (marked.get(a.session_id) ?? 0) + 1);
  const onRoster = roster.filter((r) => onRosterStatuses.includes(r.status));

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <div>
        <Link href="/coach" className="text-sm font-medium text-carolina-dark underline">
          Coach dashboard
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{program.name}</h1>
        <p className="mt-1 text-navy/70">
          {formatDate(program.start_date)} – {formatDate(program.end_date)}
          {program.location && ` · ${program.location}`}
        </p>
      </div>

      <section aria-labelledby="roster-heading" className="flex flex-col gap-3">
        <h2 id="roster-heading" className="text-xl font-semibold">
          Roster ({onRoster.length})
        </h2>
        {roster.length === 0 ? (
          <p className="text-sm text-navy/70">
            No players on this roster yet. An administrator adds players.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {roster.map(({ player, status, id: enrollmentId }) => (
              <li
                key={enrollmentId}
                className="flex flex-col gap-1 rounded-xl border border-navy/10 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/coach/players/${player.id}`}
                    className="font-semibold text-carolina-dark underline"
                  >
                    {player.first_name} {player.last_name}
                  </Link>
                  <StatusPill tone={onRosterStatuses.includes(status) ? "good" : "warn"}>
                    {enrollmentStatusOptions.find((o) => o.value === status)?.label}
                  </StatusPill>
                </div>
                <p className="text-sm text-navy/70">
                  Class of {player.graduation_year} · {labelFor(positionOptions, player.primary_position)}
                  {player.secondary_position &&
                    ` / ${labelFor(positionOptions, player.secondary_position)}`}{" "}
                  · {labelFor(experienceOptions, player.experience_level)}
                </p>
                {player.goals && <p className="text-sm">Goal: {player.goals}</p>}
                {(player.emergency_contact_name || player.emergency_contact_phone) && (
                  <p className="text-sm text-navy/70">
                    Emergency: {player.emergency_contact_name ?? ""} {player.emergency_contact_phone ?? ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="sessions-heading" className="flex flex-col gap-3">
        <h2 id="sessions-heading" className="text-xl font-semibold">
          Sessions
        </h2>
        <SessionList
          sessions={sessions.map((s) => ({
            ...s,
            programName: s.location || program.location || "",
            marked: marked.get(s.id) ?? 0,
            rosterSize: onRoster.length,
          }))}
          empty="No sessions scheduled yet."
        />
      </section>
    </div>
  );
}
