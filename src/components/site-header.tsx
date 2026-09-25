"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { isActivePath, navItemsFor, signInNavItem, site, type HeaderAccount } from "@/config/site";
import { signOut } from "@/lib/actions/auth";

export function SiteHeader({ account }: { account: HeaderAccount | null }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = navItemsFor(account);

  // Highlight only the most specific matching link (e.g. "Account" rather than "My dashboard").
  const activeHref = items
    .filter((item) => isActivePath(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

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
            {items.map((item) => (
              <li key={item.href}>
                <NavLink href={item.href} label={item.label} active={item.href === activeHref} />
              </li>
            ))}
            <li className="ml-2">
              <PrimaryAction account={account} />
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
            {items.map((item) => (
              <li key={item.href}>
                <NavLink
                  href={item.href}
                  label={item.label}
                  active={item.href === activeHref}
                  onNavigate={() => setMenuOpen(false)}
                  block
                />
              </li>
            ))}
            <li className="pt-2">
              <PrimaryAction account={account} onNavigate={() => setMenuOpen(false)} />
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

function PrimaryAction({ account, onNavigate }: { account: HeaderAccount | null; onNavigate?: () => void }) {
  const className =
    "inline-block rounded-md bg-orange px-3 py-2 text-sm font-semibold text-white hover:bg-orange-dark";
  if (!account) {
    return (
      <Link href={signInNavItem.href} onClick={onNavigate} className={className}>
        {signInNavItem.label}
      </Link>
    );
  }
  return (
    <form action={signOut}>
      <button type="submit" className={className}>
        Sign out
      </button>
    </form>
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
        active
          ? "bg-white/10 text-white underline decoration-carolina decoration-2 underline-offset-4"
          : "text-white/90 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
