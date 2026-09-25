import { expect, test } from "@playwright/test";

test("landing page shows PBP branding and ways in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("PBP Player Hub");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prepare. Develop. Compete.");
  const main = page.getByRole("main");
  await expect(main.getByRole("link", { name: "Create a parent account" }).first()).toHaveAttribute(
    "href",
    "/signup",
  );
  await expect(main.getByRole("link", { name: /PBP coaches/ })).toHaveAttribute("href", "/login");
});

const publicRoutes = [
  { path: "/", heading: "Prepare. Develop. Compete." },
  { path: "/login", heading: "Sign in" },
  { path: "/signup", heading: "Create a parent account" },
  { path: "/forgot-password", heading: "Reset your password" },
  { path: "/check-email?for=signup", heading: "Check your email" },
  { path: "/legal/terms", heading: "Terms of Service" },
  { path: "/legal/privacy", heading: "Privacy Policy" },
  { path: "/legal/parental-consent", heading: "Parental Consent" },
];

for (const { path, heading } of publicRoutes) {
  test(`${path} responds and renders`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  });
}

test("legal pages are clearly marked as drafts", async ({ page }) => {
  await page.goto("/legal/privacy");
  await expect(page.getByText("Draft placeholder: not for use with real families")).toBeVisible();
});

for (const path of ["/parent", "/parent/players/new", "/coach", "/admin"]) {
  test(`${path} sends signed-out visitors to sign in`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
    const url = new URL(page.url());
    expect(url.pathname).toBe("/login");
    expect(url.searchParams.get("next")).toBe(path);
  });
}

test("unknown routes show the not-found page", async ({ page }) => {
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
});

test("navigation reaches sign-up and sign-in", async ({ page, isMobile }) => {
  await page.goto("/");
  for (const [name, heading] of [
    ["Create account", "Create a parent account"],
    ["Sign in", "Sign in"],
  ]) {
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
    const nav = page.getByRole("navigation", { name: isMobile ? "Mobile" : "Main" });
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  }
});

test("sign-up form explains what is missing", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your first name.")).toBeVisible();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("You need to accept the Terms of Service and Privacy Policy.")).toBeVisible();
});

test("pages do not scroll horizontally", async ({ page }) => {
  for (const { path } of publicRoutes) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("responses carry security headers and a per-request script nonce", async ({ page, request }) => {
  const first = await request.get("/login");
  const second = await request.get("/login");
  const csp = first.headers()["content-security-policy"];
  expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(csp).toContain("frame-ancestors 'none'");
  expect(second.headers()["content-security-policy"]).not.toBe(csp);
  expect(first.headers()["x-frame-options"]).toBe("DENY");
  expect(first.headers()["x-content-type-options"]).toBe("nosniff");

  // The policy must not block the app's own scripts: the page stays interactive.
  const blocked: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && /Content Security Policy/i.test(msg.text())) blocked.push(msg.text());
  });
  await page.goto("/signup");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your first name.")).toBeVisible();
  expect(blocked).toEqual([]);
});

test("search engines are kept out during development and the pilot", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toMatch(/Disallow: \/\s*$/m);
});
