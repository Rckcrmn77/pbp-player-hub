import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { NoticeBanner } from "@/components/parent/notices";
import {
  ageGroupOptions,
  experienceOptions,
  labelFor,
  positionOptions,
  programOptions,
} from "@/config/player-options";
import { consentStatus } from "@/lib/consent";
import { getMyConsentRecords, getMyPlayer } from "@/lib/data/parent";

export const metadata: Metadata = { title: "Player profile" };

function Detail({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <dt className="text-sm text-navy/60">{label}</dt>
      <dd className="font-medium whitespace-pre-line">{value === null || value === "" ? "—" : value}</dd>
    </div>
  );
}

export default async function PlayerPage({ params, searchParams }: PageProps<"/parent/players/[id]">) {
  const [{ id }, { notice }] = await Promise.all([params, searchParams]);
  const [player, consents] = await Promise.all([getMyPlayer(id), getMyConsentRecords()]);
  if (!player) notFound();
  const consent = consentStatus(consents, "parental_consent", player.id);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <NoticeBanner notice={notice} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {player.first_name} {player.last_name}
          </h1>
          <p className="mt-1 text-navy/70">
            Class of {player.graduation_year} · {labelFor(programOptions, player.program)}
          </p>
        </div>
        <Link
          href={`/parent/players/${player.id}/edit`}
          className="rounded-md border border-navy/20 bg-white px-3 py-2 text-sm font-semibold hover:border-carolina-dark"
        >
          Edit profile
        </Link>
      </div>

      {consent.status !== "granted" && (
        <p className="rounded-md bg-orange/10 p-3 text-sm font-medium text-orange-dark">
          Parental consent is needed for this player.{" "}
          <Link href="/parent/consent" className="underline">
            Review consent
          </Link>
        </p>
      )}

      <section className="rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Profile</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Birth year" value={player.birth_year} />
          <Detail label="Age group" value={labelFor(ageGroupOptions, player.age_group)} />
          <Detail label="Primary position" value={labelFor(positionOptions, player.primary_position)} />
          <Detail label="Secondary position" value={labelFor(positionOptions, player.secondary_position)} />
          <Detail label="Experience" value={labelFor(experienceOptions, player.experience_level)} />
          <Detail label="Team or school" value={player.team_or_school} />
        </dl>
      </section>

      <section className="rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Goals and development</h2>
        <dl className="grid gap-4">
          <Detail label="Goals" value={player.goals} />
          <Detail label="Strengths" value={player.strengths} />
          <Detail label="Areas to improve" value={player.improvement_areas} />
        </dl>
      </section>

      <section className="rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold">Emergency contact</h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Name" value={player.emergency_contact_name} />
          <Detail label="Phone" value={player.emergency_contact_phone} />
        </dl>
      </section>

      <Link href="/parent" className="font-medium text-carolina-dark underline">
        Back to dashboard
      </Link>
    </div>
  );
}
