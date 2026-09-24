"use client";

import { SubNav } from "@/components/sub-nav";

export function ParentNav() {
  return (
    <SubNav
      label="Parent"
      links={[
        { href: "/parent", label: "Dashboard", exact: true },
        { href: "/parent/players/new", label: "Add a player", exact: true },
        { href: "/parent/consent", label: "Consent" },
        { href: "/parent/account", label: "Account" },
      ]}
    />
  );
}
