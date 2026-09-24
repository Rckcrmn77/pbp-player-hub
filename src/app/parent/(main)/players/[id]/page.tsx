import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NoticeBanner } from "@/components/notice-banner";
import {
  ageGroupOptions,
  experienceOptions,
  labelFor,
  positionOptions,
  programOptions,
} from "@/config/player-options";
import { consentStatus } from "@/lib/consent";
import { AssessmentResults } from "@/components/assessment/assessment-results";
import { BlueprintView } from "@/components/assessment/blueprint-view";
import { assessmentTypeLabels } from "@/config/assessment";
import { attendanceOptions, enrollmentStatusOptions } from "@/config/program-options";
import { getActiveBlueprint, getAssessmentDetail, listPlayerAssessments } from "@/lib/data/assessments";
import { formatDate } from "@/lib/time";
import {
  getAttendanceSummary,
  getMyConsentRecords,
  getMyPlayer,
  getMyPlayerPrograms,
} from "@/lib/data/parent";

export const metadata: Metadata = { title: "Player profile" };

function Detail({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <dt className="text-sm text-navy/60">{label}</dt>
      <dd className="font-medium whitespace-pre-line">{value === null || value === "" ? "—" : value}</dd>
    </div>
  );
}

export default async function PlayerPage({ params, searchParams }: PageProps<"/parent/players/[id]">) {
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);
  const [player, consents, allPrograms] = await Promise.all([
    getMyPlayer(id),
    getMyConsentRecords(),
    getMyPlayerPrograms(),
  ]);
  if (!player) notFound();
  const programs = allPrograms.filter((p) => p.playerId === player.id);
  const [attendance, blueprint, published] = await Promise.all([
    getAttendanceSummary(player.id),
    getActiveBlueprint(player.id),
    listPlayerAssessments(player.id),
  ]);
  // Row Level Security returns only published assessments to families.
  const assessments = (await Promise.all(published.map((a) => getAssessmentDetail(a.id)))).filter(
    (d) => d !== null,
  );
  const sessionsRecorded = Object.values(attendance).reduce((a, b) => a + b, 0);
  const consent = consentStatus(consents, "parental_consent", player.id);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <NoticeBanner notice={notice} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {player.first_name} {player.last_name}
          </h1>
          <p className="mt-1 text-navy/70">
            Class of {player.graduation_year} · {labelFor(programOptions, player.program)}
          </p>
        </div>
        <Link
          href={`/parent/players/${player.id}/edit`}
          className="rounded-md border border-navy/20 bg-white px-3 py-2 text-sm font-semibold hover:border-carolina-dark"
        >
          Edit profile
        </Link>
      </div>

      {consent.status !== "granted" && (
        <p className="rounded-md bg-orange/10 p-3 text-sm font-medium text-orange-dark">
          Parental consent is needed for this player.{" "}
          <Link href="/parent/consent" className="underline">
            Review consent
          </Link>
        </p>
      )}

      <section className="rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Profile</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Birth year" value={player.birth_year} />
          <Detail label="Age group" value={labelFor(ageGroupOptions, player.age_group)} />
          <Detail label="Primary position" value={labelFor(positionOptions, player.primary_position)} />
          <Detail label="Secondary position" value={labelFor(positionOptions, player.secondary_position)} />
          <Detail label="Experience" value={labelFor(experienceOptions, player.experience_level)} />
          <Detail label="Team or school" value={player.team_or_school} />
        </dl>
      </section>

      <section className="rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Goals and development</h2>
        <dl className="grid gap-4">
          <Detail label="Goals" value={player.goals} />
          <Detail label="Strengths" value={player.strengths} />
          <Detail label="Areas to improve" value={player.improvement_areas} />
        </dl>
      </section>

      <section aria-labelledby="blueprint-heading" className="flex flex-col gap-3">
        <h2 id="blueprint-heading" className="text-xl font-semibold">
          Current Blueprint
        </h2>
        {blueprint ? (
          <BlueprintView detail={blueprint} />
        ) : (
          <p className="rounded-xl border border-dashed border-navy/20 bg-white p-4 text-sm text-navy/70">
            No active Blueprint yet. After the baseline assessment, the coach builds a plan with priorities
            and drills.
          </p>
        )}
      </section>

      <section aria-labelledby="assessments-heading" className="flex flex-col gap-3">
        <h2 id="assessments-heading" className="text-xl font-semibold">
          Assessments
        </h2>
        {assessments.length === 0 ? (
          <p className="rounded-xl border border-dashed border-navy/20 bg-white p-4 text-sm text-navy/70">
            No assessments shared yet. You&apos;ll see each assessment here once the coach&apos;s review is
            complete.
          </p>
        ) : (
          assessments.map((detail, i) => (
            <details
              key={detail.assessment.id}
              open={i === 0}
              className="rounded-xl border border-navy/10 bg-surface p-4"
            >
              <summary className="cursor-pointer font-semibold">
                {assessmentTypeLabels[detail.assessment.assessment_type]} assessment ·{" "}
                {formatDate(detail.assessment.assessed_on)} · {detail.coachName}
              </summary>
              <div className="mt-4">
                <AssessmentResults detail={detail} />
              </div>
            </details>
          ))
        )}
      </section>

      <section className="rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">PBP programs and attendance</h2>
        {programs.length === 0 ? (
          <p className="text-sm text-navy/70">
            Not on a program roster yet. PBP adds players to rosters after registration.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="flex flex-col gap-1">
              {programs.map((p) => (
                <li key={p.enrollmentId}>
                  <span className="font-medium">{p.programName}</span>
                  <span className="text-navy/60">
                    {" "}
                    · {enrollmentStatusOptions.find((o) => o.value === p.status)?.label}
                  </span>
                </li>
              ))}
            </ul>
            {sessionsRecorded === 0 ? (
              <p className="text-sm text-navy/70">No attendance recorded yet.</p>
            ) : (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {attendanceOptions.map((o) => (
                  <div key={o.value} className="rounded-lg bg-surface p-3">
                    <dt className="text-sm text-navy/60">{o.label}</dt>
                    <dd className="text-2xl font-bold tabular-nums">{attendance[o.value]}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Emergency contact</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Name" value={player.emergency_contact_name} />
          <Detail label="Phone" value={player.emergency_contact_phone} />
        </dl>
      </section>

      <Link href="/parent" className="font-medium text-carolina-dark underline">
        Back to dashboard
      </Link>
    </div>
  );
}
