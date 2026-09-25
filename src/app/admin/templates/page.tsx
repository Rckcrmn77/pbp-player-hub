import type { Metadata } from "next";
import Link from "next/link";

import { NoticeBanner } from "@/components/notice-banner";
import { StatusPill } from "@/components/status-pill";
import { ageGroupOptions, labelFor, positionOptions } from "@/config/player-options";
import { createStarterTemplate } from "@/lib/actions/library";
import { listTemplates } from "@/lib/data/assessments";

export const metadata: Metadata = { title: "Assessment templates" };

export default async function TemplatesPage({ searchParams }: PageProps<"/admin/templates">) {
  const [{ notice }, templates] = await Promise.all([searchParams, listTemplates()]);
  return (
    <div className="flex flex-col gap-6">
      <NoticeBanner notice={notice} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assessment templates</h1>
          <p className="mt-1 max-w-2xl text-navy/70">
            A template lists what coaches rate from 1 to 5. Templates can target an age group or position, so
            PBP can change what is assessed without changing the app.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <form action={createStarterTemplate}>
            <button
              type="submit"
              className="rounded-md border border-navy/20 bg-white px-4 py-2.5 font-semibold hover:border-carolina-dark"
            >
              Start from the 5 charter categories
            </button>
          </form>
          <Link
            href="/admin/templates/new"
            className="rounded-md bg-orange px-4 py-2.5 font-semibold text-white hover:bg-orange-dark"
          >
            New template
          </Link>
        </div>
      </div>
      {templates.length === 0 ? (
        <p className="rounded-xl border border-dashed border-navy/20 bg-white p-6 text-navy/70">
          No templates yet. Coaches need at least one to start assessments.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {templates.map((t) => (
            <li key={t.id}>
              <Link
                href={`/admin/templates/${t.id}`}
                className="flex flex-col gap-1 rounded-xl border border-navy/10 bg-white p-4 hover:border-carolina-dark sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="block font-semibold">{t.name}</span>
                  <span className="text-sm text-navy/70">
                    {t.age_group ? labelFor(ageGroupOptions, t.age_group) : "All age groups"} ·{" "}
                    {t.position ? labelFor(positionOptions, t.position) : "All positions"}
                  </span>
                </span>
                <StatusPill tone={t.is_active ? "good" : "warn"}>
                  {t.is_active ? "In use" : "Retired"}
                </StatusPill>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
