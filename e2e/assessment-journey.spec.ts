import { expect, test, type Page } from "@playwright/test";

import { makeAdmin, signIn, signOut, signUpAndConfirm, sql, uniqueEmail } from "./support/accounts";

/**
 * Sprint 3 journey: an admin prepares a template and a drill; a coach assesses
 * a player, submits and approves it, and builds an active Blueprint; the admin
 * publishes the assessment; the family sees both. Program and roster setup is
 * done in the database here (the staff journey covers that UI). Fictional data.
 */
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_DB_URL,
  "needs a Supabase stack and SUPABASE_DB_URL (see README)",
);
test.describe.configure({ mode: "serial" });

const categories = [
  "Stick skills",
  "Footwork and athletic movement",
  "Position fundamentals",
  "Lacrosse IQ and decision-making",
  "Communication, confidence, and effort",
];

async function rate(page: Page, criterion: string, rating: number, comment: string) {
  await page
    .getByRole("radiogroup", { name: `Rating for ${criterion}` })
    .getByText(String(rating), { exact: true })
    .click();
  await page.getByLabel(`Comment on ${criterion}`).fill(comment);
}

test("coach assesses, builds a Blueprint, admin publishes, family sees it", async ({
  page,
  isMobile,
}, testInfo) => {
  const run = `${testInfo.project.name}-${Date.now()}`;
  const parentEmail = uniqueEmail("fam", testInfo.project.name);
  const coachEmail = uniqueEmail("coach3", testInfo.project.name);
  const adminEmail = uniqueEmail("admin3", testInfo.project.name);
  const lastName = `Nguyen ${run}`;
  const drillTitle = `Wall ball ${run}`;

  // Family and player.
  await signUpAndConfirm(page, parentEmail, "Dana", "Nguyen");
  await page.goto("/parent/players/new");
  await page.getByLabel("First name").fill("Jesse");
  await page.getByLabel("Last name").fill(lastName);
  await page.getByLabel("Birth year").selectOption("2012");
  await page.getByLabel("High school graduation year").selectOption("2030");
  await page.getByLabel("Age group").selectOption("middle_school");
  await page.getByLabel("Program").selectOption("boys");
  await page.getByLabel("Experience").selectOption("two_years");
  await page.getByLabel("Primary position").selectOption("attack");
  await page.getByLabel(/I am this player's parent or legal guardian/).check();
  await page.getByRole("button", { name: "Add player" }).click();
  await expect(page.getByText("Player added.")).toBeVisible();
  await signOut(page, isMobile);

  // Staff accounts; program and roster set up directly in the test database.
  await signUpAndConfirm(page, coachEmail, "Robin", `Coach ${run}`);
  await signOut(page, isMobile);
  await signUpAndConfirm(page, adminEmail, "Kai", "Admin");
  await makeAdmin(adminEmail);
  await sql(
    "update public.profiles set role = 'coach' where id = (select id from auth.users where email = $1)",
    [coachEmail],
  );
  const [{ id: programId }] = await sql<{ id: string }>(
    "insert into public.programs (name, start_date, end_date, status) values ($1, current_date, current_date + 60, 'active') returning id",
    [`Assessment Clinic ${run}`],
  );
  await sql(
    "insert into public.program_coaches (program_id, coach_id) select $1, id from auth.users where email = $2",
    [programId, coachEmail],
  );
  await sql(
    "insert into public.enrollments (program_id, player_id, status) select $1, id, 'active' from public.players where last_name = $2",
    [programId, lastName],
  );

  // Admin: starter template and a drill.
  await page.goto("/admin/templates");
  await page.getByRole("button", { name: "Start from the 5 charter categories" }).click();
  await expect(page.getByText("Template created.")).toBeVisible();
  await page.goto("/admin/drills/new");
  await page.getByLabel("Drill title").fill(drillTitle);
  await page.getByLabel("Skill category").fill("Stick skills");
  await page.getByLabel("Suggested reps").fill("100");
  await page.getByLabel("Video link").fill("https://example.test/wall-ball");
  await page.getByRole("button", { name: "Add drill" }).click();
  await expect(page.getByText("Drill saved.")).toBeVisible();
  await signOut(page, isMobile);

  // Coach: baseline assessment.
  await signIn(page, coachEmail);
  const missing = page.getByRole("region", { name: "Players without a baseline assessment" });
  await missing.getByRole("link", { name: new RegExp(lastName) }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Jesse ${lastName}`);
  await page.getByLabel("Template").selectOption({ label: "PBP core assessment" });
  await page.getByLabel("Type").selectOption("baseline");
  await page.getByRole("button", { name: "Start assessment" }).click();
  await expect(page.getByText("Assessment started.")).toBeVisible();

  await rate(page, categories[0], 4, "Soft hands, catches cleanly on the run.");
  await page.getByRole("button", { name: "Save and submit for approval" }).click();
  await expect(page.getByText(/Every criterion needs a rating and a comment/)).toBeVisible();

  for (const [i, category] of categories.entries()) {
    await rate(page, category, [4, 3, 3, 2, 5][i], `Comment on ${category.toLowerCase()}.`);
  }
  await page.getByLabel("Overall summary").fill("A strong start. Focus on decision-making under pressure.");
  await page.getByRole("button", { name: "Save and submit for approval" }).click();
  await expect(page.getByText("Submitted for approval.")).toBeVisible();
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText(/Approved\. An administrator will publish it/)).toBeVisible();

  // Coach: Blueprint.
  await page.getByRole("link", { name: `Jesse ${lastName}` }).click();
  await page.getByRole("button", { name: "Start a Blueprint" }).click();
  await expect(page.getByText("Blueprint started.")).toBeVisible();
  await page.getByLabel("Priority 1").fill("Read the defense before passing");
  await page.getByRole("button", { name: "Save priority 1" }).click();
  await expect(page.getByText("Priority 1 saved.")).toBeVisible();
  await page.getByLabel("Priority 2").fill("Left-hand catching");
  await page.getByRole("button", { name: "Save priority 2" }).click();
  await expect(page.getByText("Priority 2 saved.")).toBeVisible();
  await page.getByLabel("Drill", { exact: true }).selectOption({ label: `${drillTitle} (Stick skills)` });
  await page.getByLabel("Reps per week").fill("300");
  await page.getByLabel("Instructions for the player").fill("100 reps each hand, three times a week.");
  await page.getByRole("button", { name: "Assign drill" }).click();
  await expect(page.getByText("Drill assigned.")).toBeVisible();
  await page.getByRole("button", { name: "Make active for the family" }).click();
  await expect(page.getByText("Blueprint is now active")).toBeVisible();
  await signOut(page, isMobile);

  // Family: the Blueprint is visible, the assessment is not yet published.
  await signIn(page, parentEmail);
  await expect(page.getByText("Top priority: Read the defense before passing")).toBeVisible();
  await page.getByRole("link", { name: "View profile" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Jesse ${lastName}`);
  const blueprint = page.getByRole("region", { name: "Current Blueprint" });
  await expect(blueprint.getByText("Left-hand catching")).toBeVisible();
  await expect(blueprint.getByText(drillTitle)).toBeVisible();
  await expect(blueprint.getByText("300 reps per week")).toBeVisible();
  await expect(page.getByText("No assessments shared yet.")).toBeVisible();
  await signOut(page, isMobile);

  // Admin publishes.
  await signIn(page, adminEmail);
  await page.goto("/admin/assessments");
  const ready = page.getByRole("listitem").filter({ hasText: `Jesse ${lastName}` });
  await ready.getByRole("button", { name: "Publish to family" }).click();
  await expect(page.getByText("Assessment published.")).toBeVisible();
  await signOut(page, isMobile);

  // Family sees the published assessment.
  await signIn(page, parentEmail);
  await page.getByRole("link", { name: "View profile" }).click();
  const assessments = page.getByRole("region", { name: "Assessments" });
  await expect(
    assessments.getByText("A strong start. Focus on decision-making under pressure."),
  ).toBeVisible();
  await expect(assessments.getByText("Soft hands, catches cleanly on the run.")).toHaveCount(0);
  await expect(assessments.getByText("Comment on stick skills.")).toBeVisible();
});
