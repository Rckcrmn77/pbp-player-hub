import type { Metadata } from "next";

import { PortalPreview } from "@/components/portal-preview";
import { getPortal } from "@/config/site";

export const metadata: Metadata = { title: `${getPortal("parent").label} dashboard` };

export default function ParentPage() {
  return <PortalPreview role="parent" />;
}
