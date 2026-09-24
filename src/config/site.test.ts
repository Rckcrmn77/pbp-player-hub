import { describe, expect, it } from "vitest";

import { isActivePath, navItemsFor, portals } from "./site";

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

describe("navItemsFor", () => {
  it("offers account creation to signed-out visitors", () => {
    expect(navItemsFor(null).map((i) => i.href)).toEqual(["/", "/signup"]);
  });

  it("links a signed-in parent to their dashboard and account", () => {
    const items = navItemsFor({ firstName: "Pat", homeHref: "/parent", accountHref: "/parent/account" });
    expect(items.map((i) => i.href)).toEqual(["/", "/parent", "/parent/account"]);
  });

  it("omits the account link when there is none", () => {
    const items = navItemsFor({ firstName: "Sam", homeHref: "/coach", accountHref: null });
    expect(items.map((i) => i.href)).toEqual(["/", "/coach"]);
  });
});

describe("portals", () => {
  it("defines one portal per role with matching routes", () => {
    expect(portals.map((p) => p.role)).toEqual(["parent", "coach", "admin"]);
    for (const portal of portals) expect(portal.href).toBe(`/${portal.role}`);
  });
});
