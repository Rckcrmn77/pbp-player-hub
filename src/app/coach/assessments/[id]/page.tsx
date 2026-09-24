import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AssessmentResults } from "@/components/assessment/assessment-results";
import { AssessmentEditor } from "@/components/coach/assessment-forms";
import { NoticeBanner } from "@/components/notice-banner";
import { StatusPill } from "@/components/status-pill";
import { assessmentTypeLabels, reviewStatusLabels } from "@/config/assessment";
import { changeAssessmentStatus, saveAssessment } from "@/lib/actions/assessments";
import { publishAssessment } from "@/lib/actions/library";
import { getSessionUser } from "@/lib/auth/session";
import { getAssessmentDetail } from "@/lib/data/assessments";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Assessment" };

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
    <form action={changeAssessmentStatus}>
      <input type="hidden" name="assessmentId" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}

export default async function AssessmentPage({ params, searchParams }: PageProps<"/coach/assessments/[id]">) {
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);
  const [detail, user] = await Promise.all([getAssessmentDetail(id), getSessionUser()]);
  if (!detail || !user) notFound();
  const { assessment, player, template, coachName } = detail;
  const isAdmin = user.profile.role === "admin";
  const isAuthor = assessment.coach_id === user.id;
  const editable = assessment.status === "draft" && (isAuthor || isAdmin);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <NoticeBanner notice={notice} />
      <div>
        {player && (
          <Link
            href={`/coach/players/${player.id}`}
            className="text-sm font-medium text-carolina-dark underline"
          >
            {player.first_name} {player.last_name}
          </Link>
        )}
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {assessmentTypeLabels[assessment.assessment_type]} assessment
        </h1>
        <p className="mt-1 text-navy/70">
          {formatDate(assessment.assessed_on)} · {template?.name} · {coachName}
        </p>
        <div className="mt-2">
          <StatusPill
            tone={
              assessment.status === "published" ? "good" : assessment.status === "draft" ? "neutral" : "warn"
            }
          >
            {reviewStatusLabels[assessment.status]}
          </StatusPill>
        </div>
      </div>

      {editable ? (
        <AssessmentEditor
          action={saveAssessment.bind(null, id)}
          criteria={detail.criteria}
          scores={detail.scores}
          summary={assessment.summary ?? ""}
        />
      ) : (
        <>
          <AssessmentResults detail={detail} />
          <div className="flex flex-wrap gap-3">
            {assessment.status === "submitted" && (
              <>
                <StatusButton id={id} status="approved" label="Approve" className={primary} />
                {(isAuthor || isAdmin) && (
                  <StatusButton id={id} status="draft" label="Return to draft" className={secondary} />
                )}
              </>
            )}
            {assessment.status === "approved" && isAdmin && (
              <>
                <form action={publishAssessment}>
                  <input type="hidden" name="assessmentId" value={id} />
                  <button type="submit" className={primary}>
                    Publish to family
                  </button>
                </form>
                <StatusButton id={id} status="draft" label="Return to draft" className={secondary} />
              </>
            )}
            {assessment.status === "approved" && !isAdmin && (
              <p className="text-sm text-navy/70">Approved. An administrator publishes it to the family.</p>
            )}
            {assessment.status === "draft" && !editable && (
              <p className="text-sm text-navy/70">This draft belongs to {coachName}.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
