import type { Metadata } from "next";

import { LegalPage } from "@/components/legal-draft";
import { legalDocuments, legalDocumentsAreDrafts } from "@/config/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  robots: legalDocumentsAreDrafts ? { index: false } : undefined,
};

export default function PrivacyPage() {
  return (
    <LegalPage document={legalDocuments.privacy_policy}>
      <p>
        This policy explains what information the PBP Player Hub collects and how it is used and protected.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Parent or guardian: name, email address, and optional phone number.</li>
        <li>
          Player: name, birth year, graduation year, lacrosse details, goals, and an optional emergency
          contact.
        </li>
        <li>Coaching records: attendance, assessments, development plans, check-ins, and reports.</li>
      </ul>
      <p>We collect only what is needed to deliver PBP training and track player development.</p>
      <h2>Who can see it</h2>
      <ul>
        <li>You can see your own family&apos;s information.</li>
        <li>PBP coaches can see information about players in the programs they coach.</li>
        <li>PBP administrators can see information needed to run programs.</li>
      </ul>
      <p>There are no public profiles, no player directory, and no messaging between players.</p>
      <h2>How it is protected</h2>
      <p>
        Information is stored with our database provider, Supabase, and access is checked by the database for
        every request. Emails are sent through our email provider, Resend.
      </p>
      <h2>Your choices</h2>
      <p>You can update your information, withdraw consent, or ask PBP to delete your family&apos;s data.</p>
    </LegalPage>
  );
}
