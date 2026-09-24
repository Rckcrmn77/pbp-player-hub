"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SubNavLink = { href: string; label: string; exact?: boolean };

/** Section tabs under the page header (parent, coach and admin areas). */
export function SubNav({ label, links }: { label: string; links: SubNavLink[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4">
      <ul className="flex gap-1 border-b border-navy/10">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
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
