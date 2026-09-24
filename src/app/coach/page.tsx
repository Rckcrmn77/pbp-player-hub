import type { Metadata } from "next";

import { PortalPreview } from "@/components/portal-preview";
import { getPortal } from "@/config/site";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: `${getPortal("coach").label} dashboard` };

export default async function CoachPage() {
  await requireRole(["coach", "admin"], "/coach");
  return <PortalPreview role="coach" />;
}
