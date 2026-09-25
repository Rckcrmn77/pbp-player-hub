import type { Metadata } from "next";
import Link from "next/link";

import { NoticeBanner } from "@/components/notice-banner";
import { StatusPill } from "@/components/status-pill";
import { publishReport } from "@/lib/actions/progress";
import { listReportQueue, type ReportQueueItem } from "@/lib/data/progress";
import { dateKey, formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Progress reports" };

function QueueList({ items, publish = false }: { items: ReportQueueItem[]; publish?: boolean }) {
  if (items.length === 0) return <p className="text-sm text-navy/70">Nothing here right now.</p>;
  return (
    <ul className="divide-y divide-navy/10 rounded-xl border border-navy/10 bg-white">
      {items.map((r) => (
        <li key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">{r.playerName}</p>
            <p className="text-sm text-navy/60">
              {r.approved_at
                ? `Approved ${formatDate(dateKey(r.approved_at))}`
                : r.submitted_at
                  ? `Submitted ${formatDate(dateKey(r.submitted_at))}`
                  : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/coach/reports/${r.id}`}
              className="text-sm font-semibold text-carolina-dark underline"
            >
              Review
            </Link>
            {publish && (
              <form action={publishReport}>
                <input type="hidden" name="reportId" value={r.id} />
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

export default async function AdminReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  const [{ notice }, approved, submitted] = await Promise.all([
    searchParams,
    listReportQueue(["approved"]),
    listReportQueue(["submitted"]),
  ]);
  return (
    <div className="flex flex-col gap-8">
      <NoticeBanner notice={notice} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Progress reports</h1>
        <p className="mt-1 max-w-2xl text-navy/70">
          Coaches write and approve progress reports. Families see a report only after an administrator
          publishes it.
        </p>
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          Ready to publish{" "}
          <StatusPill tone={approved.length ? "warn" : "neutral"}>{approved.length}</StatusPill>
        </h2>
        <QueueList items={approved} publish />
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
