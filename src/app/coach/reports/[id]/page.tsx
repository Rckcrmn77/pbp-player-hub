import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ReportForm } from "@/components/coach/report-form";
import { NoticeBanner } from "@/components/notice-banner";
import { ReportView } from "@/components/progress/report-view";
import { StatusPill } from "@/components/status-pill";
import { reviewStatusLabels } from "@/config/assessment";
import { changeReportStatus, publishReport, refreshReportFigures, saveReport } from "@/lib/actions/progress";
import { getSessionUser } from "@/lib/auth/session";
import { getBlueprintDetail } from "@/lib/data/assessments";
import { getReportDetail } from "@/lib/data/progress";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Progress report" };

const secondary =
  "rounded-md border border-navy/20 bg-white px-4 py-2.5 font-semibold hover:border-carolina-dark";
const primary = "rounded-md bg-orange px-4 py-2.5 font-semibold text-white hover:bg-orange-dark";

function StatusButton({
  id,
  status,
  label,
  className,
}: {
  id: string;
  status: "draft" | "approved";
  label: string;
  className: string;
}) {
  return (
    <form action={changeReportStatus}>
      <input type="hidden" name="reportId" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}

/** Programs a family could sign up for next (open or active, not drafts). */
async function nextPrograms() {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("programs")
    .select("id, name")
    .in("status", ["open", "active"])
    .order("start_date");
  return data ?? [];
}

export default async function CoachReportPage({ params, searchParams }: PageProps<"/coach/reports/[id]">) {
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);
  const [detail, user] = await Promise.all([getReportDetail(id), getSessionUser()]);
  if (!detail || !user) notFound();
  const { report } = detail;
  const isAdmin = user.profile.role === "admin";
  const isAuthor = report.author_id === user.id;
  const editable = report.status === "draft" && (isAuthor || isAdmin);
  const [programs, blueprint] = await Promise.all([
    editable ? nextPrograms() : Promise.resolve([]),
    editable && report.blueprint_id ? getBlueprintDetail(report.blueprint_id) : Promise.resolve(null),
  ]);
  const suggestedPriorities = (blueprint?.priorities ?? []).map((p) => `${p.rank}. ${p.title}`).join("\n");

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <NoticeBanner notice={notice} />
      <div>
        <Link
          href={`/coach/players/${report.player_id}`}
          className="text-sm font-medium text-carolina-dark underline"
        >
          {detail.playerName}
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Progress report</h1>
        <div className="mt-2">
          <StatusPill
            tone={report.status === "published" ? "good" : report.status === "draft" ? "neutral" : "warn"}
          >
            {reviewStatusLabels[report.status]}
          </StatusPill>
        </div>
      </div>

      {editable && (
        <>
          <section className="flex flex-col gap-3 rounded-xl border border-navy/10 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Figures</h2>
              <form action={refreshReportFigures}>
                <input type="hidden" name="reportId" value={id} />
                <button type="submit" className="text-sm font-semibold text-carolina-dark underline">
                  Refresh figures
                </button>
              </form>
            </div>
            <p className="text-sm text-navy/70">
              Ratings, attendance, and check-in totals are copied into the report so a published report never
              changes. Refresh them after a follow-up assessment is approved or more check-ins arrive.
            </p>
          </section>
          <section className="flex flex-col gap-4 rounded-xl border border-navy/10 bg-white p-5">
            <h2 className="text-lg font-semibold">Coach&apos;s write-up</h2>
            <ReportForm
              action={saveReport.bind(null, id)}
              report={report}
              programs={programs}
              suggestedPriorities={suggestedPriorities}
            />
          </section>
        </>
      )}

      {!editable && (
        <div className="flex flex-wrap gap-3">
          {report.status === "submitted" && (
            <>
              <StatusButton id={id} status="approved" label="Approve report" className={primary} />
              {(isAuthor || isAdmin) && (
                <StatusButton id={id} status="draft" label="Return to draft" className={secondary} />
              )}
            </>
          )}
          {report.status === "approved" && isAdmin && (
            <>
              <form action={publishReport}>
                <input type="hidden" name="reportId" value={id} />
                <button type="submit" className={primary}>
                  Publish to family
                </button>
              </form>
              <StatusButton id={id} status="draft" label="Return to draft" className={secondary} />
            </>
          )}
          {report.status === "approved" && !isAdmin && notice !== "report-approved" && (
            <p className="text-sm text-navy/70">Approved. An administrator publishes it to the family.</p>
          )}
          {report.status === "draft" && (
            <p className="text-sm text-navy/70">This draft belongs to {detail.authorName}.</p>
          )}
        </div>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          {report.status === "published" ? "Published report" : "What the family will see"}
        </h2>
        <div className="rounded-xl bg-surface p-4 ring-1 ring-navy/10">
          <ReportView detail={detail} />
        </div>
      </section>
    </div>
  );
}
