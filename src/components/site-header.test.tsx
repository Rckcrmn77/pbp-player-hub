import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SiteHeader } from "./site-header";

const pathname = vi.hoisted(() => ({ current: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

describe("SiteHeader", () => {
  beforeEach(() => {
    pathname.current = "/";
  });

  it("links to every role destination and sign-in", () => {
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    for (const [name, href] of [
      ["Home", "/"],
      ["Parents", "/parent"],
      ["Coaches", "/coach"],
      ["Admin", "/admin"],
      ["Sign in", "/login"],
    ]) {
      expect(within(nav).getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("marks the current section", () => {
    pathname.current = "/coach";
    render(<SiteHeader />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Coaches" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("opens and closes the mobile menu", () => {
    render(<SiteHeader />);
    const toggle = screen.getByRole("button", { name: "Open menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();

    fireEvent.click(toggle);
    const mobileNav = screen.getByRole("navigation", { name: "Mobile" });
    expect(screen.getByRole("button", { name: "Close menu" })).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(within(mobileNav).getByRole("link", { name: "Parents" }));
    expect(screen.queryByRole("navigation", { name: "Mobile" })).not.toBeInTheDocument();
  });
});
