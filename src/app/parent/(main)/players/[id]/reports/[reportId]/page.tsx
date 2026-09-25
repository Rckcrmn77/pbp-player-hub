import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { ReportView } from "@/components/progress/report-view";
import { getReportDetail } from "@/lib/data/progress";

export const metadata: Metadata = { title: "Progress report" };

export default async function ParentReportPage({
  params,
}: PageProps<"/parent/players/[id]/reports/[reportId]">) {
  const { id, reportId } = await params;
  // Row Level Security returns a report to a family only once it is published.
  const detail = await getReportDetail(reportId);
  if (!detail || detail.report.player_id !== id || detail.report.status !== "published") notFound();

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/parent/players/${id}`} className="text-sm font-medium text-carolina-dark underline">
          Back to {detail.playerName}
        </Link>
        <PrintButton />
      </div>
      <h1 className="sr-only">Progress report</h1>
      <ReportView detail={detail} />
    </div>
  );
}
