import { expect, type Page } from "@playwright/test";
import { Client } from "pg";

import { latestEmailLink } from "./mailbox";

export const password = "correct-horse-battery";

export function uniqueEmail(label: string, project: string) {
  return `e2e-${label}-${project}-${Date.now()}@example.test`;
}

export async function openMenuIfMobile(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
}

/** Signs up through the app and opens the confirmation link from the test mailbox. */
export async function signUpAndConfirm(page: Page, email: string, firstName: string, lastName = "Tester") {
  const startedAt = new Date();
  await page.goto("/signup");
  await page.getByLabel("First name").fill(firstName);
  await page.getByLabel("Last name").fill(lastName);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByLabel(/I am a parent or legal guardian/).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your email");

  const link = await latestEmailLink(email, /Confirm your PBP Player Hub account/, startedAt);
  await page.goto(link);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Welcome, ${firstName}`);
}

export async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function signOut(page: Page, isMobile: boolean) {
  await openMenuIfMobile(page, isMobile);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Prepare. Develop. Compete.");
}

/**
 * Makes an account an administrator directly in the database. The app never
 * lets anyone become the first admin, so tests (and a new PBP project) do this
 * once with database access. Needs SUPABASE_DB_URL.
 */
export async function makeAdmin(email: string) {
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();
  try {
    const result = await client.query(
      "update public.profiles set role = 'admin' where id = (select id from auth.users where email = $1)",
      [email],
    );
    expect(result.rowCount).toBe(1);
  } finally {
    await client.end();
  }
}

/** Runs SQL against the local test database (fixtures only; never a hosted database). */
export async function sql<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await client.connect();
  try {
    return (await client.query(text, params)).rows as T[];
  } finally {
    await client.end();
  }
}
