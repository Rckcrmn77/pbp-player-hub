import { expect, test } from "@playwright/test";

test("landing page shows PBP branding and role destinations", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("PBP Player Hub");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prepare. Develop. Compete.");
  await expect(page.getByRole("link", { name: /Parents and guardians/ })).toHaveAttribute("href", "/parent");
  await expect(page.getByRole("link", { name: /PBP coaches/ })).toHaveAttribute("href", "/coach");
  await expect(page.getByRole("link", { name: /PBP administrators/ })).toHaveAttribute("href", "/admin");
});

const routes = [
  { path: "/", heading: "Prepare. Develop. Compete." },
  { path: "/login", heading: "Sign in" },
  { path: "/parent", heading: "Parents dashboard" },
  { path: "/coach", heading: "Coaches dashboard" },
  { path: "/admin", heading: "Admin dashboard" },
];

for (const { path, heading } of routes) {
  test(`${path} responds and renders`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  });
}

test("unknown routes show the not-found page", async ({ page }) => {
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
});

test("navigation reaches every destination", async ({ page, isMobile }) => {
  await page.goto("/");
  for (const [name, heading] of [
    ["Parents", "Parents dashboard"],
    ["Coaches", "Coaches dashboard"],
    ["Admin", "Admin dashboard"],
    ["Sign in", "Sign in"],
  ]) {
    if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
    const nav = page.getByRole("navigation", { name: isMobile ? "Mobile" : "Main" });
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  }
});

test("pages do not scroll horizontally", async ({ page }) => {
  for (const { path } of routes) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});
