import type { Metadata } from "next";

import { PortalPreview } from "@/components/portal-preview";
import { getPortal } from "@/config/site";

export const metadata: Metadata = { title: `${getPortal("admin").label} dashboard` };

export default function AdminPage() {
  return <PortalPreview role="admin" />;
}
