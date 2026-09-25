import type { Metadata } from "next";
import Link from "next/link";

import { NoticeBanner } from "@/components/notice-banner";
import { StatusPill } from "@/components/status-pill";
import { labelFor, positionOptions } from "@/config/player-options";
import { listDrills } from "@/lib/data/assessments";

export const metadata: Metadata = { title: "Drill library" };

export default async function DrillsPage({ searchParams }: PageProps<"/admin/drills">) {
  const [{ notice }, drills] = await Promise.all([searchParams, listDrills()]);
  const byCategory = new Map<string, typeof drills>();
  for (const d of drills) byCategory.set(d.skill_category, [...(byCategory.get(d.skill_category) ?? []), d]);

  return (
    <div className="flex flex-col gap-6">
      <NoticeBanner notice={notice} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drill library</h1>
          <p className="mt-1 text-navy/70">Coaches assign these drills in player Blueprints.</p>
        </div>
        <Link
          href="/admin/drills/new"
          className="rounded-md bg-orange px-4 py-2.5 font-semibold text-white hover:bg-orange-dark"
        >
          Add a drill
        </Link>
      </div>
      {drills.length === 0 ? (
        <p className="rounded-xl border border-dashed border-navy/20 bg-white p-6 text-navy/70">
          No drills yet. PBP&apos;s drill content goes here.
        </p>
      ) : (
        [...byCategory.entries()].map(([category, list]) => (
          <section key={category} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{category}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {list.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/admin/drills/${d.id}/edit`}
                    className="flex h-full flex-col gap-1 rounded-xl border border-navy/10 bg-white p-4 hover:border-carolina-dark"
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-semibold">{d.title}</span>
                      {!d.is_active && <StatusPill tone="warn">Retired</StatusPill>}
                    </span>
                    <span className="text-sm text-navy/70">
                      {d.positions.length
                        ? d.positions.map((p) => labelFor(positionOptions, p)).join(", ")
                        : "All positions"}
                      {d.target_reps && ` · ${d.target_reps} reps`}
                      {d.target_minutes && ` · ${d.target_minutes} min`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
