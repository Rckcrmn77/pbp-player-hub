import type { Metadata } from "next";
import Link from "next/link";

import { NoticeBanner } from "@/components/notice-banner";
import { StatusPill } from "@/components/status-pill";
import { assessmentTypeLabels } from "@/config/assessment";
import { publishAssessment } from "@/lib/actions/library";
import { listReviewQueue, type QueueItem } from "@/lib/data/assessments";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Assessments" };

function QueueList({ items, action }: { items: QueueItem[]; action?: "publish" }) {
  if (items.length === 0) return <p className="text-sm text-navy/70">Nothing here right now.</p>;
  return (
    <ul className="divide-y divide-navy/10 rounded-xl border border-navy/10 bg-white">
      {items.map((a) => (
        <li key={a.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{a.playerName}</p>
            <p className="text-sm text-navy/70">
              {assessmentTypeLabels[a.assessment_type]} · assessed {formatDate(a.assessed_on)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/coach/assessments/${a.id}`}
              className="text-sm font-semibold text-carolina-dark underline"
            >
              Review
            </Link>
            {action === "publish" && (
              <form action={publishAssessment}>
                <input type="hidden" name="assessmentId" value={a.id} />
                <button
                  type="submit"
                  className="rounded-md bg-orange px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-dark"
                >
                  Publish to family
                </button>
              </form>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

export default async function AdminAssessmentsPage({ searchParams }: PageProps<"/admin/assessments">) {
  const [{ notice }, approved, submitted] = await Promise.all([
    searchParams,
    listReviewQueue(["approved"]),
    listReviewQueue(["submitted"]),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <NoticeBanner notice={notice} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
        <p className="mt-1 max-w-2xl text-navy/70">
          Coaches submit and approve assessments. Families see an assessment only after an administrator
          publishes it.
        </p>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          Ready to publish{" "}
          <StatusPill tone={approved.length ? "warn" : "neutral"}>{approved.length}</StatusPill>
        </h2>
        <QueueList items={approved} action="publish" />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          Waiting for coach approval <StatusPill>{submitted.length}</StatusPill>
        </h2>
        <QueueList items={submitted} />
      </section>
    </div>
  );
}
