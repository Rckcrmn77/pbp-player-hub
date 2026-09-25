import type { Metadata, Viewport } from "next";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { site, type HeaderAccount } from "@/config/site";
import { getSessionUser, homePathFor } from "@/lib/auth/session";
import { allowIndexing } from "@/lib/security-headers";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: site.name, template: `%s · ${site.name}` },
  description: `${site.organization} player development hub. ${site.slogan}`,
  // Kept out of search engines during development and the pilot (NEXT_PUBLIC_ALLOW_INDEXING).
  robots: allowIndexing() ? undefined : { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0b1f3a",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSessionUser();
  const account: HeaderAccount | null = user
    ? {
        firstName: user.profile.first_name,
        homeHref: homePathFor(user.profile.role),
        accountHref: user.profile.role === "parent" ? "/parent/account" : null,
      }
    : null;

  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-orange focus:px-3 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        <SiteHeader account={account} />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 focus:outline-none sm:py-12"
        >
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
