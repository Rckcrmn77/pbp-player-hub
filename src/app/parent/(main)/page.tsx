import type { Metadata } from "next";
import Link from "next/link";

import { NoticeBanner } from "@/components/parent/notices";
import { PlayerCard } from "@/components/parent/player-card";
import { getSessionUser } from "@/lib/auth/session";
import { consentStatus } from "@/lib/consent";
import { getMyConsentRecords, getMyPlayers } from "@/lib/data/parent";

export const metadata: Metadata = { title: "Parent dashboard" };

const comingLater = [
  "Upcoming sessions",
  "Current Blueprint",
  "Weekly assignments",
  "Check-in status",
  "Latest progress report",
  "Register for the next program",
];

export default async function ParentDashboardPage({ searchParams }: PageProps<"/parent">) {
  const [{ notice }, user, players, consents] = await Promise.all([
    searchParams,
    getSessionUser(),
    getMyPlayers(),
    getMyConsentRecords(),
  ]);
  const firstName = user?.profile.first_name;

  return (
    <div className="flex flex-col gap-8">
      <NoticeBanner notice={notice} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {firstName ? `Welcome, ${firstName}` : "Welcome"}
        </h1>
        <p className="mt-2 text-navy/80">Manage your players and follow their development with PBP.</p>
      </div>

      <section aria-labelledby="players-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="players-heading" className="text-xl font-semibold">
            Your players
          </h2>
          {players.length > 0 && (
            <Link
              href="/parent/players/new"
              className="rounded-md bg-orange px-3 py-2 text-sm font-semibold text-white hover:bg-orange-dark"
            >
              Add a player
            </Link>
          )}
        </div>

        {players.length === 0 ? (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-navy/20 bg-white p-6">
            <p className="font-semibold">No players yet</p>
            <p className="text-sm text-navy/70">
              Add each player you manage. PBP coaches use the profile to prepare for their first assessment.
            </p>
            <Link
              href="/parent/players/new"
              className="rounded-md bg-orange px-4 py-2.5 font-semibold text-white hover:bg-orange-dark"
            >
              Add your first player
            </Link>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {players.map((player) => (
              <li key={player.id}>
                <PlayerCard
                  player={player}
                  consent={consentStatus(consents, "parental_consent", player.id).status}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="later-heading" className="flex flex-col gap-3">
        <h2 id="later-heading" className="text-xl font-semibold">
          Coming once your player joins a PBP program
        </h2>
        <ul className="grid gap-2 text-sm text-navy/70 sm:grid-cols-2 lg:grid-cols-3">
          {comingLater.map((item) => (
            <li key={item} className="rounded-lg border border-navy/10 bg-white px-4 py-3">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
