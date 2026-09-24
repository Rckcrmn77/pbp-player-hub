import { expect, test } from "@playwright/test";

import { makeAdmin, signIn, signOut, signUpAndConfirm, uniqueEmail } from "./support/accounts";

/**
 * Sprint 2 journey: an admin sets up a program, promotes and assigns a coach,
 * and builds the roster; the coach records attendance; the parent sees
 * sessions and attendance. Runs against a local Supabase stack with database
 * access (to create the first admin). All people here are fictional.
 */
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_DB_URL,
  "needs a Supabase stack and SUPABASE_DB_URL (see README)",
);
test.describe.configure({ mode: "serial" });

function todayInWilmington() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

function daysFrom(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

test("admin sets up a program, a coach takes attendance, and the parent sees it", async ({
  page,
  isMobile,
}, testInfo) => {
  const project = testInfo.project.name;
  const run = `${project}-${Date.now()}`;
  const parentEmail = uniqueEmail("family", project);
  const coachEmail = uniqueEmail("coach", project);
  const adminEmail = uniqueEmail("admin", project);
  const programName = `Fall Skills Clinic ${run}`;
  const today = todayInWilmington();

  // A family with a player.
  await signUpAndConfirm(page, parentEmail, "Pat", "Rivera");
  await page.goto("/parent/players/new");
  await page.getByLabel("First name").fill("Quinn");
  await page.getByLabel("Last name").fill(`Rivera ${run}`);
  await page.getByLabel("Birth year").selectOption("2012");
  await page.getByLabel("High school graduation year").selectOption("2030");
  await page.getByLabel("Age group").selectOption("middle_school");
  await page.getByLabel("Program").selectOption("boys");
  await page.getByLabel("Experience").selectOption("one_year");
  await page.getByLabel("Primary position").selectOption("defense");
  await page.getByLabel(/I am this player's parent or legal guardian/).check();
  await page.getByRole("button", { name: "Add player" }).click();
  await expect(page.getByText("Player added.")).toBeVisible();
  await signOut(page, isMobile);

  // Someone who will coach, and the first administrator.
  await signUpAndConfirm(page, coachEmail, "Sam", `Coach ${run}`);
  await signOut(page, isMobile);
  await signUpAndConfirm(page, adminEmail, "Alex", "Admin");

  // Until promoted, this account is a parent and cannot open the admin area.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/parent/);
  await makeAdmin(adminEmail);

  // Now an admin (the role is read fresh on each request).
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Admin");
  await page.getByRole("link", { name: "Create a program" }).first().click();
  await page.getByLabel("Program name").fill(programName);
  await page.getByLabel("Location").fill("Wilmington");
  await page.getByLabel("Status").selectOption("open");
  await page.getByLabel("Start date").fill(today);
  await page.getByLabel("End date").fill(daysFrom(today, 60));
  await page.getByLabel("Registration and payment link").fill("https://example.test/register");
  await page.getByRole("button", { name: "Create program" }).click();
  await expect(page.getByText("Program created.")).toBeVisible();

  // Three weekly sessions starting today.
  await page.getByLabel("First date").fill(today);
  await page.getByLabel("Start time").fill("06:00");
  await page.getByLabel("End time").fill("07:30");
  await page.getByLabel("Repeat").selectOption("3");
  await page.getByRole("button", { name: "Add sessions" }).click();
  await expect(page.getByText("Sessions added.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sessions (3)" })).toBeVisible();
  const programUrl = page.url().split("?")[0];

  // Promote the coach.
  await page.goto("/admin/people");
  const coachRow = page.getByRole("listitem").filter({ hasText: coachEmail });
  await coachRow.getByLabel(/Role for Sam/).selectOption("coach");
  await coachRow.getByRole("button", { name: "Change role" }).click();
  await expect(page.getByText("Role updated.")).toBeVisible();

  // Assign the coach and add the player to the roster.
  await page.goto(programUrl);
  await page.getByLabel("Coach", { exact: true }).selectOption({ label: `Sam Coach ${run}` });
  await page.getByLabel("Role", { exact: true }).selectOption("lead");
  await page.getByRole("button", { name: "Assign coach" }).click();
  await expect(page.getByText("Coach assigned.")).toBeVisible();
  await page
    .getByLabel("Player", { exact: true })
    .selectOption({ label: `Rivera ${run}, Quinn (class of 2030, Boys lacrosse)` });
  await page.getByRole("button", { name: "Add to roster" }).click();
  await expect(page.getByText("Player added to the roster.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Roster (1)" })).toBeVisible();
  await signOut(page, isMobile);

  // The coach sees today's session and records attendance.
  await signIn(page, coachEmail);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Coach dashboard");
  const today_ = page.getByRole("region", { name: "Today's sessions" });
  await expect(today_.getByText(programName)).toBeVisible();
  await expect(today_.getByText("0/1 marked")).toBeVisible();
  await today_.getByRole("link", { name: "Take attendance" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Attendance");
  await page
    .getByRole("group", { name: /Attendance for Quinn/ })
    .getByText("Present")
    .click();
  await page.getByRole("button", { name: "Save attendance" }).click();
  await expect(page.getByText("Attendance saved for 1 player.")).toBeVisible();
  await page.goto("/coach");
  await expect(page.getByRole("region", { name: "Today's sessions" }).getByText("1/1 marked")).toBeVisible();

  // Coaches cannot open the admin area, and see the roster for their program.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/coach$/);
  await page.getByRole("link", { name: new RegExp(programName) }).click();
  await expect(page.getByText(`Quinn Rivera ${run}`)).toBeVisible();
  await signOut(page, isMobile);

  // The parent sees the upcoming sessions, the open program, and the attendance.
  await signIn(page, parentEmail);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome, Pat");
  await expect(
    page.getByRole("region", { name: "Upcoming sessions" }).getByText(programName).first(),
  ).toBeVisible();
  const openProgram = page
    .getByRole("region", { name: "Open for registration" })
    .getByRole("listitem")
    .filter({
      hasText: programName,
    });
  await expect(openProgram.getByRole("link", { name: "Register with PBP" })).toHaveAttribute(
    "href",
    "https://example.test/register",
  );
  await page.getByRole("link", { name: "View profile" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Quinn Rivera ${run}`);
  await expect(page.getByText(programName)).toBeVisible();
  const present = page.getByRole("term").filter({ hasText: /^Present$/ });
  await expect(present.locator("xpath=following-sibling::dd[1]")).toHaveText("1");

  // Parents cannot open the coach area.
  await page.goto("/coach");
  await expect(page).toHaveURL(/\/parent$/);
});
