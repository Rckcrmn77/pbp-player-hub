import { expect, test } from "@playwright/test";

import { password, signOut, signUpAndConfirm, uniqueEmail } from "./support/accounts";
import { latestEmailLink } from "./support/mailbox";

/**
 * The full parent journey against a real Supabase Auth server and test mailbox
 * (the local Supabase stack). Runs only when Supabase is configured; the CI
 * "Parent journey" job starts that stack. All people here are fictional.
 */
test.skip(!process.env.NEXT_PUBLIC_SUPABASE_URL, "needs a Supabase stack (see README: npm run db:start)");
test.describe.configure({ mode: "serial" });

test("a parent signs up, adds and edits a player, manages consent, and signs back in", async ({
  page,
  isMobile,
}, testInfo) => {
  const email = uniqueEmail("parent", testInfo.project.name);

  // Sign up and confirm the email address; the terms accepted at sign-up are recorded.
  await signUpAndConfirm(page, email, "Jordan");
  await expect(page.getByText("No players yet")).toBeVisible();

  // Add a player. Parental consent is required.
  await page.getByRole("link", { name: "Add your first player" }).click();
  await page.getByLabel("First name").fill("Riley");
  await page.getByLabel("Last name").fill("Tester");
  await page.getByLabel("Birth year").selectOption("2013");
  await page.getByLabel("High school graduation year").selectOption("2031");
  await page.getByLabel("Age group").selectOption("middle_school");
  await page.getByLabel("Program").selectOption("girls");
  await page.getByLabel("Experience").selectOption("two_years");
  await page.getByLabel("Primary position").selectOption("midfield");
  await page.getByLabel("Player goals").fill("Make the high school team");
  await page.getByRole("button", { name: "Add player" }).click();
  await expect(page.getByText("You need to give parental consent to add a player.")).toBeVisible();
  // The form keeps what was entered.
  await expect(page.getByLabel("First name")).toHaveValue("Riley");
  await expect(page.getByLabel("Primary position")).toHaveValue("midfield");

  await page.getByLabel(/I am this player's parent or legal guardian/).check();
  await page.getByRole("button", { name: "Add player" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Riley Tester");
  await expect(page.getByText("Player added.")).toBeVisible();
  await expect(page.getByText("Make the high school team")).toBeVisible();

  // Edit the player.
  await page.getByRole("link", { name: "Edit profile" }).click();
  await page.getByLabel("Current team or school").fill("Cape Fear Middle");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Player details saved.")).toBeVisible();
  await expect(page.getByText("Cape Fear Middle")).toBeVisible();

  // The dashboard lists the player.
  await page.goto("/parent");
  await expect(page.getByRole("heading", { name: "Riley Tester" })).toBeVisible();
  const playerUrl = await page.getByRole("link", { name: "View profile" }).getAttribute("href");

  // Withdrawing the Terms of Service pauses access until they are accepted again.
  await page.goto("/parent/consent");
  const terms = page.getByRole("listitem").filter({ hasText: "Terms of Service" });
  await expect(terms.getByText("Given")).toBeVisible();
  await terms.getByRole("button", { name: "Withdraw" }).click();
  await expect(page.getByText("Consent withdrawn.")).toBeVisible();
  await page.goto("/parent");
  await expect(page).toHaveURL(/\/parent\/consent\?required=1/);
  await page.getByLabel(/I accept the Terms of Service/).check();
  await page.getByLabel(/I accept the Privacy Policy/).check();
  await page.getByRole("button", { name: "Accept and continue" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome, Jordan");

  // Sign out, then back in with the password.
  await signOut(page, isMobile);
  await page.goto("/parent");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That email and password don't match an account.")).toBeVisible();
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome, Jordan");

  // Sign out, then back in with an emailed link.
  await signOut(page, isMobile);
  const linkRequestedAt = new Date();
  await page.goto("/login");
  await page.getByRole("tab", { name: "Email me a link" }).click();
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your email");
  await page.goto(await latestEmailLink(email, /sign-in link/, linkRequestedAt));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome, Jordan");
  await signOut(page, isMobile);

  // A different family cannot see this player, even with its address.
  await signUpAndConfirm(page, uniqueEmail("other", testInfo.project.name), "Morgan");
  await expect(page.getByText("No players yet")).toBeVisible();
  await page.goto(playerUrl!);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expect(page.getByText("Riley")).toHaveCount(0);
});

test("a parent can reset a forgotten password", async ({ page }, testInfo) => {
  const email = uniqueEmail("reset", testInfo.project.name);
  await signUpAndConfirm(page, email, "Avery");
  await page.context().clearCookies();

  const requestedAt = new Date();
  await page.goto("/forgot-password");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("button", { name: "Email me a reset link" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your email");

  await page.goto(await latestEmailLink(email, /Reset your PBP Player Hub password/, requestedAt));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Choose a new password");
  await page.getByLabel("New password", { exact: true }).fill("a-brand-new-password");
  await page.getByLabel("Confirm new password").fill("a-brand-new-password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByText("Your new password is saved.")).toBeVisible();
});
