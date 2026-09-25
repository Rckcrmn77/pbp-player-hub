import { ProgressComparison } from "@/components/progress/progress-comparison";
import type { ReportDetail } from "@/lib/data/progress";
import { isAttendanceSnapshot, isWorkSnapshot } from "@/lib/progress";
import { dateKey, formatDate } from "@/lib/time";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid rounded-xl border border-navy/10 bg-white p-5">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-surface p-3">
      <dt className="text-sm text-navy/60">{label}</dt>
      <dd className="text-2xl font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function Text({ value, empty }: { value: string | null; empty: string }) {
  return value ? (
    <p className="whitespace-pre-line">{value}</p>
  ) : (
    <p className="text-sm text-navy/60">{empty}</p>
  );
}

/** The progress report template (charter section 4.9), shared by the coach preview and the family view. */
export function ReportView({ detail }: { detail: ReportDetail }) {
  const { report, program, recommendedProgram } = detail;
  const attendance = isAttendanceSnapshot(report.attendance_summary) ? report.attendance_summary : null;
  const work = isWorkSnapshot(report.work_summary) ? report.work_summary : null;

  return (
    <article className="flex flex-col gap-4" aria-label={`Progress report for ${detail.playerName}`}>
      <header className="rounded-xl bg-navy p-5 text-white">
        <p className="text-sm font-semibold tracking-wide text-carolina uppercase">PBP progress report</p>
        <h2 className="mt-1 text-2xl font-bold">{detail.playerName}</h2>
        <p className="mt-1 text-white/80">
          {program
            ? `${program.name} · ${formatDate(program.start_date)} – ${formatDate(program.end_date)}`
            : "PBP development"}
        </p>
        <p className="text-white/80">Coach: {detail.authorName}</p>
      </header>

      <Section title="Ratings: baseline and current (1–5)">
        <ProgressComparison
          rows={report.rating_changes}
          baselineLabel={detail.baselineDate ? `Baseline (${formatDate(detail.baselineDate)})` : "Baseline"}
          currentLabel={detail.currentDate ? `Current (${formatDate(detail.currentDate)})` : "Current"}
        />
      </Section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Attendance">
          {attendance && attendance.total > 0 ? (
            <dl className="grid grid-cols-2 gap-3">
              <Stat label="Present" value={attendance.present} />
              <Stat label="Makeup" value={attendance.makeup} />
              <Stat label="Excused" value={attendance.excused} />
              <Stat label="Absent" value={attendance.absent} />
            </dl>
          ) : (
            <p className="text-sm text-navy/60">No attendance recorded.</p>
          )}
        </Section>
        <Section title="Completed work">
          {work && work.checkIns > 0 ? (
            <dl className="grid grid-cols-2 gap-3">
              <Stat label="Weekly check-ins" value={`${work.checkIns} of ${work.weeksInPlan}`} />
              <Stat label="Weeks assignment done" value={work.weeksCompleted} />
              <Stat label="Reps logged" value={work.totalReps} />
              <Stat
                label="Average confidence"
                value={work.averageConfidence === null ? "—" : `${work.averageConfidence.toFixed(1)}/5`}
              />
            </dl>
          ) : (
            <p className="text-sm text-navy/60">No weekly check-ins were submitted.</p>
          )}
          {work && work.totalMinutes > 0 && (
            <p className="mt-2 text-sm text-navy/70">{work.totalMinutes} minutes of practice logged.</p>
          )}
        </Section>
      </div>

      <Section title="Coach observations">
        <Text value={report.coach_observations} empty="Not written yet." />
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Demonstrated strengths">
          <Text value={report.strengths} empty="Not written yet." />
        </Section>
        <Section title="Next development priorities">
          <Text value={report.next_priorities} empty="Not written yet." />
        </Section>
      </div>
      <Section title="30-day action plan">
        <Text value={report.action_plan_30_day} empty="Not written yet." />
      </Section>
      <Section title="Recommended next PBP program">
        {recommendedProgram ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">{recommendedProgram.name}</p>
            {recommendedProgram.registration_url && (
              <a
                href={recommendedProgram.registration_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md bg-orange px-3 py-2 text-sm font-semibold text-white hover:bg-orange-dark print:hidden"
              >
                Register with PBP
              </a>
            )}
          </div>
        ) : (
          <p className="text-sm text-navy/60">No program recommended.</p>
        )}
      </Section>

      <footer className="text-sm text-navy/70">
        {report.approved_at
          ? `Approved by the coach on ${formatDate(dateKey(report.approved_at))}`
          : "Not approved yet"}
        {report.published_at && ` · Published ${formatDate(dateKey(report.published_at))}`}
      </footer>
    </article>
  );
}
