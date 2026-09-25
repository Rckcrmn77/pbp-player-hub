import { expect, test } from "@playwright/test";

import { makeAdmin, signIn, signOut, signUpAndConfirm, sql, uniqueEmail } from "./support/accounts";

/**
 * Sprint 4 journey: a family submits a weekly check-in; the coach sees it,
 * compares baseline and follow-up ratings, writes a progress report, submits
 * and approves it; an administrator publishes it; the family reads it.
 * Programs, assessments and the Blueprint are set up in the database (earlier
 * journeys cover those screens). Fictional data.
 */
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_DB_URL,
  "needs a Supabase stack and SUPABASE_DB_URL (see README)",
);
test.describe.configure({ mode: "serial" });

const thisMonday = "date_trunc('week', (now() at time zone 'America/New_York')::date)::date";

test("family checks in, coach reports, admin publishes, family reads the report", async ({
  page,
  isMobile,
}, testInfo) => {
  const run = `${testInfo.project.name}-${Date.now()}`;
  const parentEmail = uniqueEmail("fam4", testInfo.project.name);
  const coachEmail = uniqueEmail("coach4", testInfo.project.name);
  const adminEmail = uniqueEmail("admin4", testInfo.project.name);
  const lastName = `Okafor ${run}`;
  const nextProgram = `Winter Skills ${run}`;

  await signUpAndConfirm(page, parentEmail, "Sam", "Okafor");
  await signOut(page, isMobile);
  await signUpAndConfirm(page, coachEmail, "Alex", `Coach ${run}`);
  await signOut(page, isMobile);
  await signUpAndConfirm(page, adminEmail, "Kai", "Admin");
  await makeAdmin(adminEmail);
  await signOut(page, isMobile);

  // Fixtures: player, program with one attended session, published baseline
  // and approved follow-up, and an active Blueprint that started two weeks ago.
  await sql(
    "update public.profiles set role = 'coach' where id = (select id from auth.users where email = $1)",
    [coachEmail],
  );
  const [{ id: playerId }] = await sql<{ id: string }>(
    `insert into public.players (first_name, last_name, birth_year, graduation_year, age_group, program,
                                 primary_position, experience_level)
     values ('Riley', $1, 2012, 2030, 'middle_school', 'girls', 'midfield', 'two_years') returning id`,
    [lastName],
  );
  await sql(
    "insert into public.parent_player_relationships (parent_id, player_id) select id, $2 from auth.users where email = $1",
    [parentEmail, playerId],
  );
  const [{ id: programId }] = await sql<{ id: string }>(
    "insert into public.programs (name, start_date, end_date, status) values ($1, current_date - 30, current_date + 30, 'active') returning id",
    [`Fall Clinic ${run}`],
  );
  await sql(
    "insert into public.programs (name, start_date, end_date, status) values ($1, current_date + 40, current_date + 90, 'open')",
    [nextProgram],
  );
  await sql(
    "insert into public.program_coaches (program_id, coach_id) select $1, id from auth.users where email = $2",
    [programId, coachEmail],
  );
  await sql("insert into public.enrollments (program_id, player_id, status) values ($1, $2, 'active')", [
    programId,
    playerId,
  ]);
  const [{ id: sessionId }] = await sql<{ id: string }>(
    "insert into public.program_sessions (program_id, starts_at, ends_at) values ($1, now() - interval '3 days', now() - interval '3 days' + interval '90 minutes') returning id",
    [programId],
  );
  await sql("insert into public.attendance (session_id, player_id, status) values ($1, $2, 'present')", [
    sessionId,
    playerId,
  ]);

  const [{ id: templateId }] = await sql<{ id: string }>(
    "insert into public.assessment_templates (name) values ($1) returning id",
    [`Core ${run}`],
  );
  const criteria = await sql<{ id: string; category: string }>(
    `insert into public.assessment_criteria (template_id, category, name, sort_order)
     values ($1, 'Stick skills', 'Catching', 10), ($1, 'Footwork and athletic movement', 'Change of direction', 20)
     returning id, category`,
    [templateId],
  );
  const coachId = `(select id from auth.users where email = '${coachEmail}')`;
  const [{ id: baselineId }] = await sql<{ id: string }>(
    `insert into public.assessments (player_id, template_id, coach_id, assessment_type, status, assessed_on)
     values ($1, $2, ${coachId}, 'baseline', 'published', current_date - 28) returning id`,
    [playerId, templateId],
  );
  const [{ id: followUpId }] = await sql<{ id: string }>(
    `insert into public.assessments (player_id, template_id, coach_id, assessment_type, status, assessed_on)
     values ($1, $2, ${coachId}, 'follow_up', 'approved', current_date - 1) returning id`,
    [playerId, templateId],
  );
  for (const c of criteria) {
    const stick = c.category === "Stick skills";
    await sql(
      "insert into public.assessment_scores (assessment_id, criterion_id, rating, comment) values ($1, $2, $3, 'Noted.'), ($4, $2, $5, 'Noted.')",
      [baselineId, c.id, stick ? 3 : 2, followUpId, stick ? 4 : 2],
    );
  }
  const [{ id: blueprintId }] = await sql<{ id: string }>(
    `insert into public.blueprints (player_id, program_id, coach_id, baseline_assessment_id, status, start_date)
     values ($1, $2, ${coachId}, $3, 'active', ${thisMonday} - 14) returning id`,
    [playerId, programId, baselineId],
  );
  await sql(
    "insert into public.blueprint_priorities (blueprint_id, rank, title) values ($1, 1, 'Weak-hand passing')",
    [blueprintId],
  );

  // Family: weekly check-in (validation first).
  await signIn(page, parentEmail);
  await page.getByRole("link", { name: "Check in for this week" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Weekly check-in");
  await page.getByRole("button", { name: "Submit check-in" }).click();
  await expect(page.getByText("Choose yes or no.")).toBeVisible();
  await expect(page.getByText("Choose a confidence rating.")).toBeVisible();

  await page
    .getByRole("group", { name: /complete this week's assignment/ })
    .getByText("Yes", { exact: true })
    .click();
  await page.getByLabel("Reps completed").fill("250");
  await page
    .getByRole("group", { name: /How confident/ })
    .getByText("4", { exact: true })
    .click();
  await page.getByLabel("Short reflection").fill("Weak-hand passes felt smoother by Friday.");
  await page.getByLabel("Question for the coach").fill("Should we add a second wall-ball session?");
  await page.getByRole("button", { name: "Submit check-in" }).click();
  await expect(page.getByText("Check-in saved.")).toBeVisible();
  const checkins = page.getByRole("region", { name: "Weekly check-ins" });
  await expect(checkins.getByText("Should we add a second wall-ball session?")).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit this week's check-in" })).toBeVisible();
  await expect(page.getByText("No progress reports yet.")).toBeVisible();
  await signOut(page, isMobile);

  // Coach: sees the question, the progress comparison, writes the report.
  await signIn(page, coachEmail);
  const questions = page.getByRole("region", { name: "Questions from families" });
  await questions.getByRole("link", { name: new RegExp(lastName) }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Riley ${lastName}`);
  const progress = page.getByRole("region", { name: "Progress", exact: true });
  await expect(progress.getByRole("row", { name: /Stick skills 3\.0 4\.0 \+1\.0/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Weekly check-ins" }).getByText("250 reps")).toBeVisible();

  await page.getByRole("button", { name: "Start a progress report" }).click();
  await expect(page.getByText("Progress report started.")).toBeVisible();
  await expect(page.getByLabel("Next development priorities")).toHaveValue("1. Weak-hand passing");
  await page.getByRole("button", { name: "Save and submit for approval" }).click();
  await expect(page.getByText(/Add coach observations before submitting/)).toBeVisible();

  await page.getByLabel("Coach observations").fill("Riley's catching improved a full point this cycle.");
  await page.getByLabel("Demonstrated strengths").fill("Coachable and consistent at home.");
  await page.getByLabel("30-day action plan").fill("Two wall-ball sessions a week, 150 reps each.");
  await page.getByLabel("Recommended next PBP program").selectOption({ label: nextProgram });
  await page.getByRole("button", { name: "Save and submit for approval" }).click();
  await expect(page.getByText("Report submitted for approval.")).toBeVisible();
  await page.getByRole("button", { name: "Approve report" }).click();
  await expect(page.getByText(/Report approved\. An administrator will publish it/)).toBeVisible();
  await signOut(page, isMobile);

  // Family cannot see it before publication.
  await signIn(page, parentEmail);
  await expect(page.getByText("This week's check-in is done.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Latest progress report" })).toHaveCount(0);
  await signOut(page, isMobile);

  // Admin publishes.
  await signIn(page, adminEmail);
  await page.goto("/admin/reports");
  const ready = page.getByRole("listitem").filter({ hasText: `Riley ${lastName}` });
  await ready.getByRole("button", { name: "Publish to family" }).click();
  await expect(page.getByText("Report published.")).toBeVisible();
  await signOut(page, isMobile);

  // Family reads the report.
  await signIn(page, parentEmail);
  await page.getByRole("link", { name: "Latest progress report" }).click();
  const report = page.getByRole("article", { name: `Progress report for Riley ${lastName}` });
  await expect(report.getByText("Riley's catching improved a full point this cycle.")).toBeVisible();
  await expect(report.getByRole("row", { name: /Stick skills 3\.0 4\.0 \+1\.0/ })).toBeVisible();
  await expect(report.getByText("1 of 3")).toBeVisible();
  await expect(report.getByText(nextProgram)).toBeVisible();
  await expect(report.getByText(/Approved by the coach on/)).toBeVisible();
});
