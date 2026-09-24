import type { Metadata } from "next";
import Link from "next/link";

import { NoticeBanner } from "@/components/notice-banner";
import { PlayerCard } from "@/components/parent/player-card";
import { getSessionUser } from "@/lib/auth/session";
import { consentStatus } from "@/lib/consent";
import {
  getMyConsentRecords,
  getMyPlayerPrograms,
  getMyPlayers,
  getMyUpcomingSessions,
  getOpenPrograms,
} from "@/lib/data/parent";
import { formatDate, formatSessionTime } from "@/lib/time";

export const metadata: Metadata = { title: "Parent dashboard" };

const comingLater = ["Current Blueprint", "Weekly assignments", "Check-in status", "Latest progress report"];

export default async function ParentDashboardPage({ searchParams }: PageProps<"/parent">) {
  const [{ notice }, user, players, consents, playerPrograms, openPrograms] = await Promise.all([
    searchParams,
    getSessionUser(),
    getMyPlayers(),
    getMyConsentRecords(),
    getMyPlayerPrograms(),
    getOpenPrograms(),
  ]);
  const upcoming = await getMyUpcomingSessions(players, playerPrograms);
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
                  programs={playerPrograms.filter((p) => p.playerId === player.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {players.length > 0 && (
        <section aria-labelledby="sessions-heading" className="flex flex-col gap-3">
          <h2 id="sessions-heading" className="text-xl font-semibold">
            Upcoming sessions
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-navy/70">
              No sessions scheduled. Sessions appear here once your player is on a PBP program roster.
            </p>
          ) : (
            <ul className="divide-y divide-navy/10 rounded-xl border border-navy/10 bg-white">
              {upcoming.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-0.5 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-medium">{formatSessionTime(s.startsAt, s.endsAt)}</p>
                    <p className="text-sm text-navy/60">
                      {s.programName}
                      {s.location && ` · ${s.location}`}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-navy/80">{s.playerNames.join(", ")}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {openPrograms.length > 0 && (
        <section aria-labelledby="register-heading" className="flex flex-col gap-3">
          <h2 id="register-heading" className="text-xl font-semibold">
            Open for registration
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {openPrograms.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 rounded-xl border border-navy/10 bg-white p-4">
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-navy/70">
                  {formatDate(p.start_date)} – {formatDate(p.end_date)}
                  {p.location && ` · ${p.location}`}
                </p>
                {p.schedule_description && <p className="text-sm text-navy/70">{p.schedule_description}</p>}
                {p.registration_url && (
                  <a
                    href={p.registration_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 self-start rounded-md bg-orange px-3 py-2 text-sm font-semibold text-white hover:bg-orange-dark"
                  >
                    Register with PBP
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="later-heading" className="flex flex-col gap-3">
        <h2 id="later-heading" className="text-xl font-semibold">
          Coming in later releases
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
