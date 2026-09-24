import { requireRole } from "@/lib/auth/session";

export default async function CoachLayout({ children }: LayoutProps<"/coach">) {
  await requireRole(["coach", "admin"], "/coach");
  return children;
}
