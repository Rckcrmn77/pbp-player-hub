import type { Metadata } from "next";
import Link from "next/link";

import { Notice } from "@/components/notice";
import { AcceptAgreementsForm } from "@/components/parent/consent-forms";
import { NoticeBanner } from "@/components/parent/notices";
import { accountConsentTypes, legalDocuments, legalDocumentsAreDrafts } from "@/config/legal";
import { changeConsent } from "@/lib/actions/parent";
import { consentStatus, hasAccountConsent, type ConsentEntry } from "@/lib/consent";
import { getMyConsentRecords, getMyPlayers } from "@/lib/data/parent";

export const metadata: Metadata = { title: "Consent" };

const statusLabel: Record<ConsentEntry["status"], string> = {
  granted: "Given",
  withdrawn: "Withdrawn",
  outdated: "New version to review",
  missing: "Not given",
};

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/New_York" }).format(
    new Date(iso),
  );
}

function ConsentRow({ title, href, entry }: { title: string; href: string; entry: ConsentEntry }) {
  const granted = entry.status === "granted";
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-navy/10 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-navy/70">
          <Link href={href} target="_blank" className="text-carolina-dark underline">
            Read the document
          </Link>
          {entry.latest && ` · Last updated ${formatDate(entry.latest.created_at)}`}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            granted ? "bg-carolina-light text-navy" : "bg-orange/10 text-orange-dark"
          }`}
        >
          {statusLabel[entry.status]}
        </span>
        <form action={changeConsent}>
          <input type="hidden" name="consentType" value={entry.type} />
          <input type="hidden" name="playerId" value={entry.playerId ?? ""} />
          <input type="hidden" name="granted" value={granted ? "false" : "true"} />
          <button
            type="submit"
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
              granted
                ? "border border-navy/20 text-navy hover:border-orange hover:text-orange-dark"
                : "bg-orange text-white hover:bg-orange-dark"
            }`}
          >
            {granted ? "Withdraw" : "Give consent"}
          </button>
        </form>
      </div>
    </li>
  );
}

export default async function ConsentPage({ searchParams }: PageProps<"/parent/consent">) {
  const [{ notice, required }, records, players] = await Promise.all([
    searchParams,
    getMyConsentRecords(),
    getMyPlayers(),
  ]);
  const accountOk = hasAccountConsent(records);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <NoticeBanner notice={notice} />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Consent</h1>
        <p className="mt-2 text-navy/80">
          Review what you have agreed to. Every change is kept as a dated record.
        </p>
      </div>

      {legalDocumentsAreDrafts && (
        <Notice title="Draft documents">
          The Terms of Service, Privacy Policy, and Parental Consent wording is placeholder text for
          development and will be replaced after legal review before launch.
        </Notice>
      )}

      {!accountOk && (
        <section
          aria-labelledby="accept-heading"
          className="flex flex-col gap-4 rounded-xl border-2 border-orange/40 bg-white p-5"
        >
          <h2 id="accept-heading" className="text-lg font-semibold">
            {required ? "Please accept to continue" : "Accept the account agreements"}
          </h2>
          <p className="text-sm text-navy/80">
            You need to accept the current Terms of Service and Privacy Policy to use the Player Hub.
          </p>
          <AcceptAgreementsForm />
        </section>
      )}

      {accountOk && (
        <section aria-labelledby="account-heading" className="flex flex-col gap-3">
          <h2 id="account-heading" className="text-xl font-semibold">
            Account agreements
          </h2>
          <ul className="flex flex-col gap-3">
            {accountConsentTypes.map((type) => (
              <ConsentRow
                key={type}
                title={legalDocuments[type].title}
                href={legalDocuments[type].href}
                entry={consentStatus(records, type)}
              />
            ))}
          </ul>
          <p className="text-sm text-navy/70">
            Withdrawing either agreement pauses your access until you accept it again.
          </p>
        </section>
      )}

      <section aria-labelledby="players-consent-heading" className="flex flex-col gap-3">
        <h2 id="players-consent-heading" className="text-xl font-semibold">
          Parental consent for each player
        </h2>
        {players.length === 0 ? (
          <p className="text-sm text-navy/70">You haven&apos;t added any players yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {players.map((player) => (
              <ConsentRow
                key={player.id}
                title={`${player.first_name} ${player.last_name}`}
                href={legalDocuments.parental_consent.href}
                entry={consentStatus(records, "parental_consent", player.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
