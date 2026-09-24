import "server-only";

import type { User } from "@supabase/supabase-js";

import { accountConsentTypes, legalDocuments } from "@/config/legal";
import { consentStatus } from "@/lib/consent";
import type { ServerClient } from "@/lib/supabase/server";
import type { ConsentType } from "@/lib/supabase/types";

const metadataKey: Record<(typeof accountConsentTypes)[number], string> = {
  terms_of_service: "accepted_terms_version",
  privacy_policy: "accepted_privacy_version",
};

/**
 * Records the Terms of Service and Privacy Policy acceptance given on the
 * sign-up form, once the new parent has a session. Only versions that match
 * the current documents are recorded, and never twice. Anything not recorded
 * here is asked for again on the consent page.
 */
export async function recordSignupConsent(supabase: ServerClient, user: User): Promise<void> {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;

  const { data: existing } = await supabase
    .from("consent_records")
    .select("consent_type, player_id, document_version, granted, created_at")
    .is("player_id", null);

  const toRecord: { consent_type: ConsentType; document_version: string; granted: boolean }[] = [];
  for (const type of accountConsentTypes) {
    const accepted = metadata[metadataKey[type]];
    const current = legalDocuments[type].version;
    if (accepted === current && consentStatus(existing ?? [], type).status === "missing") {
      toRecord.push({ consent_type: type, document_version: current, granted: true });
    }
  }

  if (toRecord.length > 0) await supabase.from("consent_records").insert(toRecord);
}
