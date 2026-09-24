import { accountConsentTypes, legalDocuments } from "@/config/legal";
import type { ConsentRecordRow, ConsentType } from "@/lib/supabase/types";

export type ConsentStatus = "granted" | "withdrawn" | "outdated" | "missing";

export type ConsentEntry = {
  type: ConsentType;
  playerId: string | null;
  status: ConsentStatus;
  /** The most recent record, if any. */
  latest: Pick<ConsentRecordRow, "document_version" | "granted" | "created_at"> | null;
};

type RecordLike = Pick<
  ConsentRecordRow,
  "consent_type" | "player_id" | "document_version" | "granted" | "created_at"
>;

/**
 * Works out the current state of one consent from an append-only history.
 * The newest record wins; a grant only counts if it is for the current version.
 */
export function consentStatus(
  records: RecordLike[],
  type: ConsentType,
  playerId: string | null = null,
): ConsentEntry {
  const latest =
    records
      .filter((r) => r.consent_type === type && (r.player_id ?? null) === playerId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;

  let status: ConsentStatus = "missing";
  if (latest) {
    if (!latest.granted) status = "withdrawn";
    else if (latest.document_version !== legalDocuments[type].version) status = "outdated";
    else status = "granted";
  }

  return {
    type,
    playerId,
    status,
    latest: latest
      ? { document_version: latest.document_version, granted: latest.granted, created_at: latest.created_at }
      : null,
  };
}

/** True when the parent has accepted the current Terms of Service and Privacy Policy. */
export function hasAccountConsent(records: RecordLike[]): boolean {
  return accountConsentTypes.every((type) => consentStatus(records, type).status === "granted");
}
