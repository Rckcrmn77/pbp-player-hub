import type { ConsentType } from "@/lib/supabase/types";

/**
 * Legal documents and their current versions.
 *
 * PLACEHOLDER: all wording is draft text for development and must be replaced
 * after a legal/privacy review before launch. Changing a `version` asks every
 * parent to accept the new version the next time they sign in.
 */
export const legalDocumentsAreDrafts = true;

export type LegalDocument = {
  type: ConsentType;
  title: string;
  href: string;
  version: string;
};

export const legalDocuments: Record<ConsentType, LegalDocument> = {
  terms_of_service: {
    type: "terms_of_service",
    title: "Terms of Service",
    href: "/legal/terms",
    version: "draft-2026-09",
  },
  privacy_policy: {
    type: "privacy_policy",
    title: "Privacy Policy",
    href: "/legal/privacy",
    version: "draft-2026-09",
  },
  parental_consent: {
    type: "parental_consent",
    title: "Parental Consent",
    href: "/legal/parental-consent",
    version: "draft-2026-09",
  },
};

/** Account-level documents every parent must accept before using the app. */
export const accountConsentTypes = ["terms_of_service", "privacy_policy"] as const satisfies ConsentType[];
