import { Notice } from "@/components/notice";
import { getPortal, type Role } from "@/config/site";

/**
 * Placeholder dashboard for a role. It lists the sections planned for that
 * dashboard and shows no data. The page using it checks the role on the server.
 */
export function PortalPreview({ role }: { role: Role }) {
  const portal = getPortal(role);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold tracking-wide text-carolina-dark uppercase">{portal.audience}</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{portal.label} dashboard</h1>
        <p className="mt-2 max-w-2xl text-navy/80">{portal.summary}</p>
      </div>

      <Notice title="Preview: this dashboard is still being built">
        The tools below are planned for upcoming releases. No player or family information is shown here yet.
      </Notice>

      <section aria-labelledby={`${role}-planned`}>
        <h2 id={`${role}-planned`} className="text-lg font-semibold">
          Planned sections
        </h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {portal.plannedSections.map((section) => (
            <li key={section} className="rounded-lg border border-navy/10 bg-white p-4">
              <p className="font-medium">{section}</p>
              <p className="mt-1 text-sm text-navy/60">Coming soon</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
