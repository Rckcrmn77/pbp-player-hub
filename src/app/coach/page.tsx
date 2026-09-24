import type { Metadata } from "next";

import { PortalPreview } from "@/components/portal-preview";
import { getPortal } from "@/config/site";

export const metadata: Metadata = { title: `${getPortal("coach").label} dashboard` };

export default function CoachPage() {
  return <PortalPreview role="coach" />;
}
