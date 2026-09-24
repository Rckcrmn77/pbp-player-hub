import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "./site-header";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));
vi.mock("@/lib/actions/auth", () => ({ signOut: vi.fn() }));

const parent = { firstName: "Pat", homeHref: "/parent", accountHref: "/parent/account" };

describe("SiteHeader", () => {
  beforeEach(() => {
    pathname.current = "/";
  });

  it("shows sign-in and account creation when signed out", () => {
    render(<SiteHeader account={null} />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Create account" })).toHaveAttribute("href", "/signup");
    expect(within(nav).getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
    expect(within(nav).queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
  });

  it("shows the dashboard, account and sign-out when signed in", () => {
    render(<SiteHeader account={parent} />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "My dashboard" })).toHaveAttribute("href", "/parent");
    expect(within(nav).getByRole("link", { name: "Account" })).toHaveAttribute("href", "/parent/account");
    expect(within(nav).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Sign in" })).not.toBeInTheDocument();
  });

  it("marks only the most specific current section", () => {
    pathname.current = "/parent/account";
    render(<SiteHeader account={parent} />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Account" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "My dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("opens and closes the mobile menu", () => {
    render(<SiteHeader account={null} />);
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();

    fireEvent.click(toggle);
    const mobileNav = screen.getByRole("navigation", { name: "Mobile" });
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(within(mobileNav).getByRole("link", { name: "Create account" }));
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });
});
