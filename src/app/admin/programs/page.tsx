import type { Metadata } from "next";
import Link from "next/link";

import { NoticeBanner } from "@/components/notice-banner";
import { StatusPill } from "@/components/status-pill";
import { ageGroupOptions, labelFor, programOptions } from "@/config/player-options";
import { programStatusOptions } from "@/config/program-options";
import { listPrograms } from "@/lib/data/staff";
import { formatDate } from "@/lib/time";

export const metadata: Metadata = { title: "Programs" };

export default async function ProgramsPage({ searchParams }: PageProps<"/admin/programs">) {
  const [{ notice }, programs] = await Promise.all([searchParams, listPrograms()]);

  return (
    <div className="flex flex-col gap-6">
      <NoticeBanner notice={notice} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
        <Link
          href="/admin/programs/new"
          className="rounded-md bg-orange px-4 py-2.5 font-semibold text-white hover:bg-orange-dark"
        >
          Create a program
        </Link>
      </div>

      {programs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-navy/20 bg-white p-6 text-navy/70">
          No programs yet. Create one to start scheduling sessions and building rosters.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {programs.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/programs/${p.id}`}
                className="flex flex-col gap-1 rounded-xl border border-navy/10 bg-white p-4 hover:border-carolina-dark sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-navy/70">
                    {formatDate(p.start_date)} – {formatDate(p.end_date)}
                    {p.location && ` · ${p.location}`}
                    {p.age_group && ` · ${labelFor(ageGroupOptions, p.age_group)}`}
                    {p.program && ` · ${labelFor(programOptions, p.program)}`}
                  </p>
                </div>
                <StatusPill tone={p.status === "draft" ? "warn" : "good"}>
                  {programStatusOptions.find((o) => o.value === p.status)?.label}
                </StatusPill>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
