import { ParentNav } from "@/components/parent/parent-nav";
import { requireRole } from "@/lib/auth/session";

export default async function ParentLayout({ children }: LayoutProps<"/parent">) {
  // Server-side check on every parent page; coaches and admins go to their own dashboards.
  await requireRole(["parent"], "/parent");
  return (
    <div className="flex flex-col gap-8">
      <ParentNav />
      {children}
    </div>
  );
}
