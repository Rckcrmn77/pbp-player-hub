import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AttendanceForm } from "@/components/coach/attendance-form";
import { Notice } from "@/components/notice";
import { labelFor, positionOptions } from "@/config/player-options";
import { onRosterStatuses } from "@/config/program-options";
import { saveAttendance } from "@/lib/actions/coach";
import { getAttendanceForSessions, getProgram, getRoster, getSession } from "@/lib/data/staff";
import { formatSessionTime } from "@/lib/time";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage({ params }: PageProps<"/coach/sessions/[id]">) {
  const { id } = await params;
  const session = await getSession(id);
  if (!session) notFound();
  const [program, roster, attendance] = await Promise.all([
    getProgram(session.program_id),
    getRoster(session.program_id),
    getAttendanceForSessions([id]),
  ]);
  if (!program) notFound();

  const recorded = new Map(attendance.map((a) => [a.player_id, a.status]));
  // Players on the roster, plus anyone already marked (for example a player who later withdrew).
  const rows = roster
    .filter((r) => onRosterStatuses.includes(r.status) || recorded.has(r.player_id))
    .map((r) => ({
      playerId: r.player_id,
      name: `${r.player.first_name} ${r.player.last_name}`,
      detail: `Class of ${r.player.graduation_year} · ${labelFor(positionOptions, r.player.primary_position)}`,
      status: recorded.get(r.player_id) ?? null,
    }));

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href={`/coach/programs/${program.id}`}
          className="text-sm font-medium text-carolina-dark underline"
        >
          {program.name}
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Attendance</h1>
        <p className="mt-1 text-navy/70">
          {formatSessionTime(session.starts_at, session.ends_at)}
          {(session.location || program.location) && ` · ${session.location || program.location}`}
        </p>
      </div>

      {session.status === "cancelled" && (
        <Notice title="This session was cancelled">You can still record attendance if it went ahead.</Notice>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-navy/70">No players on this roster yet.</p>
      ) : (
        <AttendanceForm action={saveAttendance.bind(null, id)} rows={rows} />
      )}
    </div>
  );
}
