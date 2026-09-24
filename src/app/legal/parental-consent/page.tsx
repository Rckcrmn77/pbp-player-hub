import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-draft";
import { legalDocuments, legalDocumentsAreDrafts } from "@/config/legal";

export const metadata: Metadata = {
  title: "Parental Consent",
  robots: legalDocumentsAreDrafts ? { index: false } : undefined,
};

export default function ParentalConsentPage() {
  return (
    <LegalPage document={legalDocuments.parental_consent}>
      <p>
        By giving parental consent for a player, you confirm that you are that player&apos;s parent or legal
        guardian, and you agree that PBP may:
      </p>
      <ul>
        <li>store the player information you provide in the Player Hub;</li>
        <li>record attendance, assessments, development plans, and progress reports about the player;</li>
        <li>share that information with you and with the PBP coaches who work with the player.</li>
      </ul>
      <p>
        You can withdraw consent at any time from the Consent page in your account. [To be decided in review:
        what PBP does with a player&apos;s existing records when consent is withdrawn.]
      </p>
    </LegalPage>
  );
}
