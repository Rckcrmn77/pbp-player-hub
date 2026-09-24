"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/parent", label: "Dashboard", exact: true },
  { href: "/parent/players/new", label: "Add a player", exact: true },
  { href: "/parent/consent", label: "Consent", exact: false },
  { href: "/parent/account", label: "Account", exact: false },
];

export function ParentNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Parent" className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 border-b border-navy/10">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`-mb-px block border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap ${
                  active
                    ? "border-orange text-navy"
                    : "border-transparent text-navy/70 hover:border-navy/20 hover:text-navy"
                }`}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
