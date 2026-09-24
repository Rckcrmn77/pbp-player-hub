import { describe, expect, it } from "vitest";

import { getPortal, isActivePath, mainNav, portals, signInNavItem } from "./site";

describe("isActivePath", () => {
  it("matches home only on the exact root path", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/parent", "/")).toBe(false);
  });

  it("matches a section and its nested pages", () => {
    expect(isActivePath("/coach", "/coach")).toBe(true);
    expect(isActivePath("/coach/roster", "/coach")).toBe(true);
  });

  it("does not match paths that only share a prefix", () => {
    expect(isActivePath("/coaches", "/coach")).toBe(false);
    expect(isActivePath("/administrator", "/admin")).toBe(false);
  });
});

describe("navigation config", () => {
  it("defines one portal per role with matching routes", () => {
    expect(portals.map((p) => p.role)).toEqual(["parent", "coach", "admin"]);
    for (const portal of portals) {
      expect(portal.href).toBe(`/${portal.role}`);
      expect(portal.plannedSections.length).toBeGreaterThan(0);
    }
  });

  it("has unique destinations including sign-in", () => {
    const hrefs = [...mainNav, signInNavItem].map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(hrefs).toEqual(["/", "/parent", "/coach", "/admin", "/login"]);
  });

  it("looks up portals by role", () => {
    expect(getPortal("admin").label).toBe("Admin");
  });
});
