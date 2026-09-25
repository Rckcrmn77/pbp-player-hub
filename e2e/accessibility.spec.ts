import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./support/a11y";

/** Public pages, checked with axe on desktop and phone. Signed-in pages: accessibility-journey.spec.ts. */
const publicPages = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/check-email?for=signup",
  "/legal/terms",
  "/legal/privacy",
  "/legal/parental-consent",
  "/does-not-exist",
];

for (const path of publicPages) {
  test(`${path} has no accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expectNoA11yViolations(page);
  });
}

test("form errors are accessible", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your first name.")).toBeVisible();
  await expectNoA11yViolations(page);
});

test("the first Tab lands on the skip link, which moves focus to the content", async ({ page }) => {
  await page.goto("/login");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
});
