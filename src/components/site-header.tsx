"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { isActivePath, mainNav, signInNavItem, site } from "@/config/site";

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold tracking-tight"
          onClick={() => setMenuOpen(false)}
        >
          <span
            aria-hidden="true"
            className="grid h-8 place-items-center rounded-md bg-orange px-2 text-sm font-black"
          >
            PBP
          </span>
          <span>{site.name}</span>
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {mainNav.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} label={item.label} active={isActivePath(pathname, item.href)} />
              </li>
            ))}
            <li>
              <Link
                href={signInNavItem.href}
                className="ml-2 rounded-md bg-orange px-3 py-2 text-sm font-semibold hover:bg-orange-dark"
              >
                {signInNavItem.label}
              </Link>
            </li>
          </ul>
        </nav>

        <button
          type="button"
          className="rounded-md p-2 hover:bg-white/10 md:hidden"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Mobile" className="border-t border-white/10 md:hidden">
          <ul className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-3">
            {[...mainNav, signInNavItem].map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  label={item.label}
                  active={isActivePath(pathname, item.href)}
                  onNavigate={() => setMenuOpen(false)}
                  block
                />
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}

function NavLink({
  href,
  label,
  active,
  onNavigate,
  block = false,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate?: () => void;
  block?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`${block ? "block py-3" : "py-2"} rounded-md px-3 text-sm font-medium ${
        active ? "bg-white/10 text-carolina" : "text-white/90 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
