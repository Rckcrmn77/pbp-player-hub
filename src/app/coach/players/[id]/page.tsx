import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StartAssessmentForm } from "@/components/coach/assessment-forms";
import { NoticeBanner } from "@/components/notice-banner";
import { StatusPill } from "@/components/status-pill";
import { assessmentTypeLabels, blueprintStatusLabels, reviewStatusLabels } from "@/config/assessment";
import { experienceOptions, labelFor, positionOptions, programOptions } from "@/config/player-options";
import { createBlueprint, startAssessment } from "@/lib/actions/assessments";
import { getSessionUser } from "@/lib/auth/session";
import {
  getPlayer,
  listPlayerAssessments,
  listPlayerBlueprints,
  listTemplates,
} from "@/lib/data/assessments";
import { getMyCoachPrograms, getRoster } from "@/lib/data/staff";
import { dateKey, formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Player" };

export default async function CoachPlayerPage({ params, searchParams }: PageProps<"/coach/players/[id]">) {
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);
  const player = await getPlayer(id);
  if (!player) notFound();
  const user = (await getSessionUser())!;

  const [assessments, blueprints, templates, myPrograms] = await Promise.all([
    listPlayerAssessments(id),
    listPlayerBlueprints(id),
    listTemplates(),
    getMyCoachPrograms(user.id),
  ]);
  const rosters = await Promise.all(
    myPrograms.map(async (p) => ({ program: p, roster: await getRoster(p.id) })),
  );
  const playerPrograms = rosters
    .filter((r) => r.roster.some((e) => e.player_id === id))
    .map((r) => r.program);

  const usableTemplates = templates
    .filter((t) => t.is_active)
    .filter((t) => !t.age_group || t.age_group === player.age_group)
    .filter(
      (t) =>
        !t.position || t.position === player.primary_position || t.position === player.secondary_position,
    )
    .map((t) => ({ id: t.id, label: t.name }));
  const latestFinished = assessments.find((a) => a.status !== "draft");

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <NoticeBanner notice={notice} />
      <div>
        <Link href="/coach" className="text-sm font-medium text-carolina-dark underline">
          Coach dashboard
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {player.first_name} {player.last_name}
        </h1>
        <p className="mt-1 text-navy/70">
          Class of {player.graduation_year} · {labelFor(programOptions, player.program)} ·{" "}
          {labelFor(positionOptions, player.primary_position)}
          {player.secondary_position && ` / ${labelFor(positionOptions, player.secondary_position)}`} ·{" "}
          {labelFor(experienceOptions, player.experience_level)}
        </p>
        {player.goals && <p className="mt-2">Goal: {player.goals}</p>}
      </div>

      <section aria-labelledby="assessments-heading" className="flex flex-col gap-3">
        <h2 id="assessments-heading" className="text-xl font-semibold">
          Assessments
        </h2>
        {assessments.length > 0 && (
          <ul className="divide-y divide-navy/10 rounded-xl border border-navy/10 bg-white">
            {assessments.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/coach/assessments/${a.id}`}
                  className="flex flex-col gap-1 p-4 hover:bg-surface sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium">
                    {assessmentTypeLabels[a.assessment_type]} · {formatDate(a.assessed_on)}
                  </span>
                  <StatusPill
                    tone={a.status === "published" ? "good" : a.status === "draft" ? "neutral" : "warn"}
                  >
                    {reviewStatusLabels[a.status]}
                  </StatusPill>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <details className="rounded-xl border border-navy/10 bg-white p-4" open={assessments.length === 0}>
          <summary className="cursor-pointer font-semibold">Start an assessment</summary>
          <div className="mt-4">
            <StartAssessmentForm
              action={startAssessment.bind(null, id)}
              templates={usableTemplates}
              programs={playerPrograms.map((p) => ({ id: p.id, name: p.name }))}
              defaultType={
                assessments.some((a) => a.assessment_type === "baseline") ? "follow_up" : "baseline"
              }
              today={dateKey(new Date())}
            />
          </div>
        </details>
      </section>

      <section aria-labelledby="blueprints-heading" className="flex flex-col gap-3">
        <h2 id="blueprints-heading" className="text-xl font-semibold">
          Blueprints
        </h2>
        {blueprints.length > 0 && (
          <ul className="divide-y divide-navy/10 rounded-xl border border-navy/10 bg-white">
            {blueprints.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/coach/blueprints/${b.id}`}
                  className="flex flex-col gap-1 p-4 hover:bg-surface sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium">Started {formatDate(b.start_date)}</span>
                  <StatusPill tone={b.status === "active" ? "good" : "neutral"}>
                    {blueprintStatusLabels[b.status]}
                  </StatusPill>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <form
          action={createBlueprint}
          className="flex flex-col gap-2 rounded-xl border border-navy/10 bg-white p-4"
        >
          <input type="hidden" name="playerId" value={id} />
          <input type="hidden" name="baselineAssessmentId" value={latestFinished?.id ?? ""} />
          <input type="hidden" name="programId" value={playerPrograms[0]?.id ?? ""} />
          <input type="hidden" name="playerGoals" value={player.goals ?? ""} />
          <p className="text-sm text-navy/70">
            {latestFinished
              ? `A new Blueprint starts from the ${assessmentTypeLabels[latestFinished.assessment_type].toLowerCase()} assessment of ${formatDate(latestFinished.assessed_on)}.`
              : "Tip: complete a baseline assessment first, so the Blueprint builds on it."}
          </p>
          <div>
            <button
              type="submit"
              className="rounded-md bg-orange px-4 py-2.5 font-semibold text-white hover:bg-orange-dark"
            >
              Start a Blueprint
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
