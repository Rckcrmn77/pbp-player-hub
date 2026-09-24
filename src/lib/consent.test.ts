import { describe, expect, it } from "vitest";

import { legalDocuments } from "@/config/legal";

import { consentStatus, hasAccountConsent } from "./consent";

const v = (type: keyof typeof legalDocuments) => legalDocuments[type].version;

function record(
  consent_type: keyof typeof legalDocuments,
  granted: boolean,
  created_at: string,
  extra: { player_id?: string | null; document_version?: string } = {},
) {
  return {
    consent_type,
    granted,
    created_at,
    player_id: extra.player_id ?? null,
    document_version: extra.document_version ?? v(consent_type),
  };
}

describe("consentStatus", () => {
  it("is missing with no records", () => {
    expect(consentStatus([], "terms_of_service").status).toBe("missing");
  });

  it("uses the newest record", () => {
    const records = [
      record("terms_of_service", true, "2026-09-01T00:00:00Z"),
      record("terms_of_service", false, "2026-09-02T00:00:00Z"),
    ];
    expect(consentStatus(records, "terms_of_service").status).toBe("withdrawn");
    expect(
      consentStatus(
        [...records, record("terms_of_service", true, "2026-09-03T00:00:00Z")],
        "terms_of_service",
      ).status,
    ).toBe("granted");
  });

  it("treats consent to an older document version as outdated", () => {
    const records = [record("privacy_policy", true, "2026-09-01T00:00:00Z", { document_version: "old" })];
    expect(consentStatus(records, "privacy_policy").status).toBe("outdated");
  });

  it("keeps parental consent separate for each player", () => {
    const records = [record("parental_consent", true, "2026-09-01T00:00:00Z", { player_id: "p1" })];
    expect(consentStatus(records, "parental_consent", "p1").status).toBe("granted");
    expect(consentStatus(records, "parental_consent", "p2").status).toBe("missing");
  });
});

describe("hasAccountConsent", () => {
  it("requires both the terms and the privacy policy", () => {
    const terms = record("terms_of_service", true, "2026-09-01T00:00:00Z");
    const privacy = record("privacy_policy", true, "2026-09-01T00:00:00Z");
    expect(hasAccountConsent([terms])).toBe(false);
    expect(hasAccountConsent([terms, privacy])).toBe(true);
  });
});
