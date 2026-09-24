import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-draft";
import { legalDocuments, legalDocumentsAreDrafts } from "@/config/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  robots: legalDocumentsAreDrafts ? { index: false } : undefined,
};

export default function TermsPage() {
  return (
    <LegalPage document={legalDocuments.terms_of_service}>
      <p>
        These terms describe how parents and guardians may use the PBP Player Hub run by Project Blueprint
        Athlete Development (&quot;PBP&quot;).
      </p>
      <h2>Who can have an account</h2>
      <p>
        Accounts are for parents and legal guardians aged 18 or over, and for PBP staff. Players use the
        Player Hub through their parent&apos;s account and do not have their own accounts.
      </p>
      <h2>Your responsibilities</h2>
      <ul>
        <li>Keep your sign-in details private.</li>
        <li>Only add players you are the parent or legal guardian of.</li>
        <li>Keep player information accurate and up to date.</li>
      </ul>
      <h2>Coach feedback and reports</h2>
      <p>
        Assessments and progress reports are the professional opinion of PBP coaches and are shared only after
        coach review. They are not medical advice.
      </p>
      <h2>Payments</h2>
      <p>
        The Player Hub does not take payments. Registration and payment happen through PBP&apos;s existing
        process.
      </p>
      <h2>Closing your account</h2>
      <p>You can ask PBP to close your account and delete your family&apos;s information at any time.</p>
    </LegalPage>
  );
}
