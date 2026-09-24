import { redirect } from "next/navigation";

import { hasAccountConsent } from "@/lib/consent";
import { getMyConsentRecords } from "@/lib/data/parent";

/** Parents must accept the current Terms of Service and Privacy Policy before using the dashboard. */
export default async function ConsentGateLayout({ children }: { children: React.ReactNode }) {
  const records = await getMyConsentRecords();
  if (!hasAccountConsent(records)) redirect("/parent/consent?required=1");
  return children;
}
