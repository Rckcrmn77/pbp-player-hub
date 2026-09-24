import type { Metadata } from "next";

import { PortalPreview } from "@/components/portal-preview";
import { getPortal } from "@/config/site";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: `${getPortal("admin").label} dashboard` };

export default async function AdminPage() {
  await requireRole(["admin"], "/admin");
  return <PortalPreview role="admin" />;
}
