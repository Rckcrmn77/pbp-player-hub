import Link from "next/link";

import { portals, site } from "@/config/site";

const journey = [
  "Baseline assessment",
  "Personal Blueprint",
  "Assigned drills",
  "Weekly check-ins",
  "Coach feedback",
  "Progress report",
];

export default function HomePage() {
  return (
    <div className="flex flex-col gap-12">
      <section className="-mx-4 rounded-none bg-navy px-4 py-10 text-white sm:mx-0 sm:rounded-2xl sm:px-10 sm:py-14">
        <p className="text-sm font-semibold tracking-wide text-carolina uppercase">{site.organization}</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{site.slogan}</h1>
        <p className="mt-4 max-w-2xl text-lg text-white/85">
          The PBP Player Hub connects every lacrosse athlete to Project Blueprint before, during, and after
          training — so families can see where their player is today, what to work on, and the progress
          they&apos;ve made.
        </p>
        <p className="mt-6 font-semibold text-white">{site.tagline}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-orange px-4 py-2.5 font-semibold text-white hover:bg-orange-dark"
          >
            Create a parent account
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-white/40 px-4 py-2.5 font-semibold text-white hover:bg-white/10"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section aria-labelledby="journey-heading">
        <h2 id="journey-heading" className="text-2xl font-bold tracking-tight">
          How the Blueprint works
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {journey.map((step, index) => (
            <li key={step} className="flex items-center gap-3 rounded-lg border border-navy/10 bg-white p-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-carolina-light text-sm font-bold text-navy">
                {index + 1}
              </span>
              <span className="font-medium">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="portals-heading">
        <h2 id="portals-heading" className="text-2xl font-bold tracking-tight">
          Who it&apos;s for
        </h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-3">
          {portals.map((portal) => (
            <li key={portal.role}>
              <Link
                href={portal.role === "parent" ? "/signup" : "/login"}
                className="flex h-full flex-col rounded-lg border border-navy/10 bg-white p-5 transition-colors hover:border-carolina focus-visible:border-carolina"
              >
                <span className="text-lg font-semibold">{portal.audience}</span>
                <span className="mt-2 text-sm text-navy/70">{portal.summary}</span>
                <span className="mt-4 text-sm font-semibold text-carolina-dark">
                  {portal.role === "parent" ? "Create a parent account →" : "Staff sign in →"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
