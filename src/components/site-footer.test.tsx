import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SiteFooter } from "./site-footer";

describe("SiteFooter", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("hides the feedback link until an address is configured", () => {
    vi.stubEnv("NEXT_PUBLIC_FEEDBACK_EMAIL", "");
    render(<SiteFooter />);
    expect(screen.queryByRole("link", { name: "Email PBP" })).not.toBeInTheDocument();
  });

  it("links to the configured feedback address", () => {
    vi.stubEnv("NEXT_PUBLIC_FEEDBACK_EMAIL", "pilot@example.test");
    render(<SiteFooter />);
    expect(screen.getByRole("link", { name: "Email PBP" }).getAttribute("href")).toMatch(
      /^mailto:pilot@example\.test\?subject=/,
    );
  });
});
