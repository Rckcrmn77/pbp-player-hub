import type { Metadata } from "next";
import Link from "next/link";

import { SessionList, type SessionListItem } from "@/components/coach/session-list";
import { StatusPill } from "@/components/status-pill";
import { assignmentRoleOptions } from "@/config/program-options";
import { getSessionUser } from "@/lib/auth/session";
import { assessmentTypeLabels } from "@/config/assessment";
import { listReviewQueue, playersWithoutBaseline } from "@/lib/data/assessments";
import {
  getAttendanceForSessions,
  getMyCoachPrograms,
  getRoster,
  getSessionsBetween,
  type SessionWithProgram,
} from "@/lib/data/staff";
import { addDays, dateKey, formatDate, zonedToUtc } from "@/lib/time";

export const metadata: Metadata = { title: "Coach dashboard" };

const later = ["Missing check-ins", "Progress report approvals"];

export default async function CoachDashboardPage() {
  const user = (await getSessionUser())!;
  const programs = await getMyCoachPrograms(user.id);

  const today = dateKey(new Date());
  const startOfToday = zonedToUtc(today, "00:00").toISOString();
  const startOfTomorrow = zonedToUtc(addDays(today, 1), "00:00").toISOString();
  const weekAhead = zonedToUtc(addDays(today, 8), "00:00").toISOString();
  const monthAgo = zonedToUtc(addDays(today, -30), "00:00").toISOString();
  const now = new Date().toISOString();

  const [todays, upcoming, recent] = await Promise.all([
    getSessionsBetween(programs, startOfToday, startOfTomorrow),
    getSessionsBetween(programs, startOfTomorrow, weekAhead),
    getSessionsBetween(programs, monthAgo, startOfToday),
  ]);
  const [attendance, rosters, awaitingApproval] = await Promise.all([
    getAttendanceForSessions([...todays, ...recent].map((s) => s.id)),
    Promise.all(programs.map((p) => getRoster(p.id))),
    listReviewQueue(["submitted"]),
  ]);
  const rosterPlayers = new Map(
    rosters
      .flat()
      .filter((r) => r.status === "active" || r.status === "pending")
      .map((r) => [r.player_id, r.player]),
  );
  const missingBaseline = await playersWithoutBaseline([...rosterPlayers.keys()]);
  const marked = new Map<string, number>();
  for (const a of attendance) marked.set(a.session_id, (marked.get(a.session_id) ?? 0) + 1);
  const rosterSize = new Map(programs.map((p) => [p.id, p.rosterCount]));

  const withCounts = (sessions: SessionWithProgram[]): SessionListItem[] =>
    sessions.map((s) => ({
      ...s,
      marked: marked.get(s.id) ?? 0,
      rosterSize: rosterSize.get(s.program_id) ?? 0,
    }));
  const needsAttendance = withCounts(recent)
    .filter((s) => s.status !== "cancelled" && s.starts_at < now && s.marked < s.rosterSize)
    .reverse();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Coach dashboard</h1>
        <p className="mt-2 text-navy/80">Your sessions, rosters, and attendance.</p>
      </div>

      {programs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-navy/20 bg-white p-6 text-navy/70">
          You aren&apos;t assigned to any programs yet. An administrator assigns coaches to programs.
        </p>
      ) : (
        <>
          <section aria-labelledby="today-heading" className="flex flex-col gap-3">
            <h2 id="today-heading" className="text-xl font-semibold">
              Today&apos;s sessions
            </h2>
            <SessionList sessions={withCounts(todays)} empty="No sessions today." />
          </section>

          {needsAttendance.length > 0 && (
            <section aria-labelledby="missing-heading" className="flex flex-col gap-3">
              <h2 id="missing-heading" className="text-xl font-semibold">
                Attendance still to record
              </h2>
              <SessionList sessions={needsAttendance} empty="" />
            </section>
          )}

          {(awaitingApproval.length > 0 || missingBaseline.size > 0) && (
            <div className="grid gap-6 lg:grid-cols-2">
              {awaitingApproval.length > 0 && (
                <section aria-labelledby="approval-heading" className="flex flex-col gap-3">
                  <h2 id="approval-heading" className="text-xl font-semibold">
                    Assessments to approve
                  </h2>
                  <ul className="divide-y divide-navy/10 rounded-xl border border-navy/10 bg-white">
                    {awaitingApproval.map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/coach/assessments/${a.id}`}
                          className="flex justify-between gap-3 p-4 hover:bg-surface"
                        >
                          <span className="font-medium">{a.playerName}</span>
                          <span className="text-sm text-navy/60">
                            {assessmentTypeLabels[a.assessment_type]}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {missingBaseline.size > 0 && (
                <section aria-labelledby="baseline-heading" className="flex flex-col gap-3">
                  <h2 id="baseline-heading" className="text-xl font-semibold">
                    Players without a baseline assessment
                  </h2>
                  <ul className="divide-y divide-navy/10 rounded-xl border border-navy/10 bg-white">
                    {[...missingBaseline].map((playerId) => {
                      const p = rosterPlayers.get(playerId)!;
                      return (
                        <li key={playerId}>
                          <Link
                            href={`/coach/players/${playerId}`}
                            className="flex justify-between gap-3 p-4 hover:bg-surface"
                          >
                            <span className="font-medium">
                              {p.first_name} {p.last_name}
                            </span>
                            <span className="text-sm font-semibold text-carolina-dark">Assess</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>
          )}

          <section aria-labelledby="upcoming-heading" className="flex flex-col gap-3">
            <h2 id="upcoming-heading" className="text-xl font-semibold">
              Next 7 days
            </h2>
            <SessionList sessions={withCounts(upcoming)} empty="No sessions in the next week." />
          </section>

          <section aria-labelledby="programs-heading" className="flex flex-col gap-3">
            <h2 id="programs-heading" className="text-xl font-semibold">
              Your programs
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {programs.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/coach/programs/${p.id}`}
                    className="flex h-full flex-col gap-1 rounded-xl border border-navy/10 bg-white p-4 hover:border-carolina-dark"
                  >
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-sm text-navy/70">
                      {formatDate(p.start_date)} – {formatDate(p.end_date)}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-2">
                      <StatusPill tone="good">
                        {p.rosterCount} player{p.rosterCount === 1 ? "" : "s"}
                      </StatusPill>
                      <StatusPill>
                        {assignmentRoleOptions.find((o) => o.value === p.assignmentRole)?.label}
                      </StatusPill>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section aria-labelledby="later-heading" className="flex flex-col gap-3">
        <h2 id="later-heading" className="text-xl font-semibold">
          Coming in later sprints
        </h2>
        <ul className="grid gap-2 text-sm text-navy/70 sm:grid-cols-2">
          {later.map((item) => (
            <li key={item} className="rounded-lg border border-navy/10 bg-white px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
