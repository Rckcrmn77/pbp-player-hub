/**
 * Brand copy and route configuration shared across the app.
 * Brand colors live in `src/app/globals.css` (the `@theme` block).
 */

export const site = {
  name: "PBP Player Hub",
  organization: "Project Blueprint Athlete Development",
  tagline: "Building Athletes. Developing Leaders.",
  slogan: "Prepare. Develop. Compete.",
  region: "Wilmington & the Cape Fear region",
} as const;

export type Role = "parent" | "coach" | "admin";

export type Portal = {
  role: Role;
  href: `/${Role}`;
  label: string;
  audience: string;
  summary: string;
  /** Planned dashboard sections from the project charter (section 4.10). */
  plannedSections: readonly string[];
};

/**
 * Role destinations. These pages are previews: sign-in and role checks are
 * not implemented yet, so nothing here grants or implies access.
 */
export const portals: readonly Portal[] = [
  {
    role: "parent",
    href: "/parent",
    label: "Parents",
    audience: "Parents and guardians",
    summary: "Follow your player's Blueprint, weekly work, and coach-approved progress reports.",
    plannedSections: [
      "Player cards",
      "Upcoming sessions",
      "Current Blueprint",
      "Weekly assignments",
      "Check-in status",
      "Latest published report",
      "Register or book the next session",
    ],
  },
  {
    role: "coach",
    href: "/coach",
    label: "Coaches",
    audience: "PBP coaches",
    summary: "Take attendance, complete assessments, assign drills, and approve reports.",
    plannedSections: [
      "Today's sessions",
      "Assigned roster",
      "Missing assessments",
      "Missing check-ins",
      "Attendance entry",
      "Assessment and report approval queue",
    ],
  },
  {
    role: "admin",
    href: "/admin",
    label: "Admin",
    audience: "PBP administrators",
    summary: "Manage programs, rosters, coaches, the drill library, and report publication.",
    plannedSections: [
      "Users and roles",
      "Players",
      "Programs and rosters",
      "Coaches",
      "Drill library",
      "Assessment templates",
      "Report publication",
    ],
  },
];

export type NavItem = { href: string; label: string };

export const mainNav: readonly NavItem[] = [
  { href: "/", label: "Home" },
  ...portals.map(({ href, label }) => ({ href, label })),
];

export const signInNavItem: NavItem = { href: "/login", label: "Sign in" };

/** True when `pathname` is `href` or a page nested under it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getPortal(role: Role): Portal {
  const portal = portals.find((p) => p.role === role);
  if (!portal) throw new Error(`Unknown role: ${role}`);
  return portal;
}
