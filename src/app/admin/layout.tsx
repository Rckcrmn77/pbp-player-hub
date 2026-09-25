import { SubNav } from "@/components/sub-nav";
import { requireRole } from "@/lib/auth/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireRole(["admin"], "/admin");
  return (
    <div className="flex flex-col gap-8">
      <SubNav
        label="Admin"
        links={[
          { href: "/admin", label: "Overview", exact: true },
          { href: "/admin/programs", label: "Programs" },
          { href: "/admin/assessments", label: "Assessments" },
          { href: "/admin/templates", label: "Templates" },
          { href: "/admin/drills", label: "Drills" },
          { href: "/admin/people", label: "People" },
        ]}
      />
      {children}
    </div>
  );
}
