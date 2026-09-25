import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddSessionsForm, AssignCoachForm, EnrollPlayerForm } from "@/components/admin/admin-forms";
import { NoticeBanner } from "@/components/notice-banner";
import { StatusPill } from "@/components/status-pill";
import { ageGroupOptions, labelFor, positionOptions, programOptions } from "@/config/player-options";
import {
  assignmentRoleOptions,
  enrollmentStatusOptions,
  programStatusOptions,
  sessionStatusLabels,
} from "@/config/program-options";
import {
  addSessions,
  assignCoach,
  enrollPlayer,
  removeCoach,
  setEnrollmentStatus,
  setSessionStatus,
} from "@/lib/actions/admin";
import {
  getProgram,
  getProgramCoaches,
  getProgramSessions,
  getRoster,
  listActiveCoaches,
  listAllPlayers,
} from "@/lib/data/staff";
import { formatDate, formatSessionTime } from "@/lib/time";

export const metadata: Metadata = { title: "Program" };

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-4 rounded-xl border border-navy/10 bg-white p-5"
    >
      <h2 id={id} className="text-lg font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

const smallButton =
  "rounded-md border border-navy/20 px-2.5 py-1 text-sm font-semibold hover:border-carolina-dark disabled:opacity-60";

export default async function AdminProgramPage({ params, searchParams }: PageProps<"/admin/programs/[id]">) {
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);
  const program = await getProgram(id);
  if (!program) notFound();

  const [sessions, coaches, roster, activeCoaches, allPlayers] = await Promise.all([
    getProgramSessions(id),
    getProgramCoaches(id),
    getRoster(id),
    listActiveCoaches(),
    listAllPlayers(),
  ]);

  const assignedIds = new Set(coaches.map((c) => c.coach_id));
  const rosterIds = new Set(roster.map((r) => r.player_id));
  const status = programStatusOptions.find((o) => o.value === program.status);

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <NoticeBanner notice={notice} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/programs" className="text-sm font-medium text-carolina-dark underline">
            All programs
          </Link>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">{program.name}</h1>
          <p className="mt-1 text-navy/70">
            {formatDate(program.start_date)} – {formatDate(program.end_date)}
            {program.location && ` · ${program.location}`}
          </p>
        </div>
        <Link
          href={`/admin/programs/${id}/edit`}
          className="rounded-md border border-navy/20 bg-white px-3 py-2 text-sm font-semibold hover:border-carolina-dark"
        >
          Edit details
        </Link>
      </div>

      <Section id="details-heading" title="Details">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-navy/70">Status</dt>
            <dd>
              <StatusPill tone={program.status === "draft" ? "warn" : "good"}>{status?.label}</StatusPill>
              <span className="ml-2 text-sm text-navy/70">{status?.hint}</span>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-navy/70">Players</dt>
            <dd className="font-medium">
              {labelFor(ageGroupOptions, program.age_group) === "—"
                ? "All age groups"
                : labelFor(ageGroupOptions, program.age_group)}
              {" · "}
              {program.program ? labelFor(programOptions, program.program) : "Boys and girls"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-navy/70">Schedule</dt>
            <dd className="font-medium whitespace-pre-line">{program.schedule_description || "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-navy/70">Registration link</dt>
            <dd className="font-medium break-all">
              {program.registration_url ? (
                <a
                  href={program.registration_url}
                  className="text-carolina-dark underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {program.registration_url}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>
      </Section>

      <Section id="sessions-heading" title={`Sessions (${sessions.length})`}>
        {sessions.length > 0 && (
          <ul className="divide-y divide-navy/10">
            {sessions.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div>
                  <p className={`font-medium ${s.status === "cancelled" ? "text-navy/70 line-through" : ""}`}>
                    {formatSessionTime(s.starts_at, s.ends_at)}
                  </p>
                  <p className="text-sm text-navy/70">
                    {s.location || program.location || "Location to be confirmed"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {s.status !== "scheduled" && (
                    <StatusPill tone={s.status === "cancelled" ? "warn" : "neutral"}>
                      {sessionStatusLabels[s.status]}
                    </StatusPill>
                  )}
                  <form action={setSessionStatus}>
                    <input type="hidden" name="programId" value={id} />
                    <input type="hidden" name="sessionId" value={s.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={s.status === "cancelled" ? "scheduled" : "cancelled"}
                    />
                    <button type="submit" className={smallButton}>
                      {s.status === "cancelled" ? "Restore" : "Cancel"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        <details className="rounded-lg border border-navy/10 p-4" open={sessions.length === 0}>
          <summary className="cursor-pointer font-semibold">Add sessions</summary>
          <div className="mt-4">
            <AddSessionsForm action={addSessions.bind(null, id)} />
          </div>
        </details>
      </Section>

      <Section id="coaches-heading" title={`Coaches (${coaches.length})`}>
        {coaches.length > 0 && (
          <ul className="divide-y divide-navy/10">
            {coaches.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-sm text-navy/70">
                    {assignmentRoleOptions.find((o) => o.value === c.assignment_role)?.label}
                  </p>
                </div>
                <form action={removeCoach}>
                  <input type="hidden" name="programId" value={id} />
                  <input type="hidden" name="assignmentId" value={c.id} />
                  <button type="submit" className={smallButton}>
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <AssignCoachForm
          action={assignCoach.bind(null, id)}
          coaches={activeCoaches.filter((c) => !assignedIds.has(c.id))}
        />
      </Section>

      <Section id="roster-heading" title={`Roster (${roster.length})`}>
        {roster.length > 0 && (
          <ul className="divide-y divide-navy/10">
            {roster.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div>
                  <p className="font-medium">
                    {r.player.first_name} {r.player.last_name}
                  </p>
                  <p className="text-sm text-navy/70">
                    Class of {r.player.graduation_year} ·{" "}
                    {labelFor(positionOptions, r.player.primary_position)}
                  </p>
                </div>
                <form action={setEnrollmentStatus} className="flex items-center gap-2">
                  <input type="hidden" name="programId" value={id} />
                  <input type="hidden" name="enrollmentId" value={r.id} />
                  <label htmlFor={`status-${r.id}`} className="sr-only">
                    Roster status for {r.player.first_name} {r.player.last_name}
                  </label>
                  <select
                    id={`status-${r.id}`}
                    name="status"
                    defaultValue={r.status}
                    className="rounded-md border border-navy/20 bg-white px-2 py-1 text-sm"
                  >
                    {enrollmentStatusOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className={smallButton}>
                    Update
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <EnrollPlayerForm
          action={enrollPlayer.bind(null, id)}
          players={allPlayers
            .filter((p) => !rosterIds.has(p.id))
            .map((p) => ({
              id: p.id,
              label: `${p.last_name}, ${p.first_name} (class of ${p.graduation_year}, ${labelFor(programOptions, p.program)})`,
            }))}
        />
      </Section>
    </div>
  );
}
