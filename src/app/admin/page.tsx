import type { Metadata } from "next";
import Link from "next/link";

import { getAdminCounts } from "@/lib/data/staff";

export const metadata: Metadata = { title: "Admin" };

const later = ["Drill library", "Assessment templates", "Report publication"];

export default async function AdminPage() {
  const counts = await getAdminCounts();
  const tiles = [
    {
      label: "Programs open or in progress",
      value: counts.openPrograms + counts.activePrograms,
      href: "/admin/programs",
    },
    { label: "Players", value: counts.players, href: "/admin/programs" },
    { label: "Parents", value: counts.parents, href: "/admin/people" },
    { label: "Coaches", value: counts.coaches, href: "/admin/people" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin</h1>
        <p className="mt-2 text-navy/80">
          Set up programs, schedule sessions, assign coaches, and manage rosters.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.label}>
            <Link
              href={t.href}
              className="flex h-full flex-col rounded-xl border border-navy/10 bg-white p-4 hover:border-carolina-dark"
            >
              <span className="text-3xl font-bold tabular-nums">{t.value}</span>
              <span className="text-sm text-navy/70">{t.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Common tasks</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/programs/new"
            className="rounded-md bg-orange px-4 py-2.5 font-semibold text-white hover:bg-orange-dark"
          >
            Create a program
          </Link>
          <Link
            href="/admin/people"
            className="rounded-md border border-navy/20 bg-white px-4 py-2.5 font-semibold hover:border-carolina-dark"
          >
            Promote a coach
          </Link>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Coming in later sprints</h2>
        <ul className="grid gap-2 text-sm text-navy/70 sm:grid-cols-3">
          {later.map((item) => (
            <li key={item} className="rounded-lg border border-navy/10 bg-white px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
