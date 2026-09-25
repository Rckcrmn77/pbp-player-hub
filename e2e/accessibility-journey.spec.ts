import { expect, test, type Page } from "@playwright/test";

import { expectNoA11yViolations } from "./support/a11y";
import { makeAdmin, signIn, signOut, signUpAndConfirm, sql, uniqueEmail } from "./support/accounts";

/**
 * Accessibility check (axe, WCAG 2.2 AA) of every signed-in page, with real
 * content on each: a player with assessments, an active Blueprint, a
 * check-in, attendance and a published report. Fixtures are fictional and
 * created in the local test database.
 */
test.skip(
  !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_DB_URL,
  "needs a Supabase stack and SUPABASE_DB_URL (see README)",
);
test.describe.configure({ mode: "serial" });

const thisMonday = "date_trunc('week', (now() at time zone 'America/New_York')::date)::date";

async function audit(page: Page, paths: string[]) {
  for (const path of paths) {
    await test.step(path, async () => {
      await page.goto(path);
      await expectNoA11yViolations(page);
    });
  }
}

test("signed-in pages have no accessibility violations", async ({ page, isMobile }, testInfo) => {
  test.setTimeout(180_000);
  const run = `${testInfo.project.name}-${Date.now()}`;
  const parentEmail = uniqueEmail("a11y-fam", testInfo.project.name);
  const coachEmail = uniqueEmail("a11y-coach", testInfo.project.name);
  const adminEmail = uniqueEmail("a11y-admin", testInfo.project.name);

  for (const [email, first] of [
    [parentEmail, "Pat"],
    [coachEmail, "Jamie"],
    [adminEmail, "Kai"],
  ]) {
    await signUpAndConfirm(page, email, first, `A11y ${run}`);
    await signOut(page, isMobile);
  }
  await makeAdmin(adminEmail);
  await sql(
    "update public.profiles set role = 'coach' where id = (select id from auth.users where email = $1)",
    [coachEmail],
  );
  const coachId = `(select id from auth.users where email = '${coachEmail}')`;

  const [{ id: player }] = await sql<{ id: string }>(
    `insert into public.players (first_name, last_name, birth_year, graduation_year, age_group, program,
                                 primary_position, experience_level, goals)
     values ('Morgan', $1, 2012, 2030, 'middle_school', 'boys', 'attack', 'two_years', 'Make varsity') returning id`,
    [`A11y ${run}`],
  );
  await sql(
    "insert into public.parent_player_relationships (parent_id, player_id) select id, $2 from auth.users where email = $1",
    [parentEmail, player],
  );
  const [{ id: program }] = await sql<{ id: string }>(
    "insert into public.programs (name, start_date, end_date, status) values ($1, current_date - 30, current_date + 30, 'active') returning id",
    [`A11y Clinic ${run}`],
  );
  await sql(`insert into public.program_coaches (program_id, coach_id) select $1, ${coachId}`, [program]);
  await sql("insert into public.enrollments (program_id, player_id, status) values ($1, $2, 'active')", [
    program,
    player,
  ]);
  const [{ id: session }] = await sql<{ id: string }>(
    "insert into public.program_sessions (program_id, starts_at, ends_at) values ($1, now() - interval '2 days', now() - interval '2 days' + interval '1 hour') returning id",
    [program],
  );
  await sql("insert into public.attendance (session_id, player_id, status) values ($1, $2, 'present')", [
    session,
    player,
  ]);
  const [{ id: template }] = await sql<{ id: string }>(
    "insert into public.assessment_templates (name) values ($1) returning id",
    [`A11y template ${run}`],
  );
  const [{ id: criterion }] = await sql<{ id: string }>(
    "insert into public.assessment_criteria (template_id, category, name) values ($1, 'Stick skills', 'Catching') returning id",
    [template],
  );
  const [{ id: published }] = await sql<{ id: string }>(
    `insert into public.assessments (player_id, template_id, coach_id, assessment_type, status, summary)
     values ($1, $2, ${coachId}, 'baseline', 'published', 'Good start.') returning id`,
    [player, template],
  );
  await sql(
    "insert into public.assessment_scores (assessment_id, criterion_id, rating, comment) values ($1, $2, 3, 'Solid hands.')",
    [published, criterion],
  );
  const [{ id: draft }] = await sql<{ id: string }>(
    `insert into public.assessments (player_id, template_id, coach_id, assessment_type)
     values ($1, $2, ${coachId}, 'follow_up') returning id`,
    [player, template],
  );
  const [{ id: drill }] = await sql<{ id: string }>(
    "insert into public.drills (title, skill_category, target_reps) values ($1, 'Stick skills', 100) returning id",
    [`A11y wall ball ${run}`],
  );
  const [{ id: blueprint }] = await sql<{ id: string }>(
    `insert into public.blueprints (player_id, program_id, coach_id, baseline_assessment_id, status, start_date)
     values ($1, $2, ${coachId}, $3, 'active', ${thisMonday} - 7) returning id`,
    [player, program, published],
  );
  await sql(
    "insert into public.blueprint_priorities (blueprint_id, rank, title) values ($1, 1, 'Weak hand')",
    [blueprint],
  );
  await sql(
    "insert into public.blueprint_drills (blueprint_id, drill_id, weekly_reps_target, instructions) values ($1, $2, 300, 'Both hands.')",
    [blueprint, drill],
  );
  await sql(
    `insert into public.weekly_checkins (blueprint_id, player_id, week_start, assignment_completed, reps_completed,
                                         confidence, reflection, question_for_coach, submitted_by)
     select $1, $2, ${thisMonday} - 7, true, 250, 4, 'Felt good.', 'More reps?', id from auth.users where email = $3`,
    [blueprint, player, parentEmail],
  );
  const [{ id: report }] = await sql<{ id: string }>(
    `insert into public.progress_reports (player_id, program_id, blueprint_id, baseline_assessment_id, author_id, status,
                                          rating_changes, attendance_summary, work_summary, coach_observations)
     values ($1, $2, $3, $4, ${coachId}, 'published',
             '[{"category": "Stick skills", "baseline": 3, "current": 4, "change": 1}]',
             '{"present": 1, "absent": 0, "excused": 0, "makeup": 0, "total": 1}',
             '{"weeksInPlan": 2, "checkIns": 1, "weeksCompleted": 1, "totalReps": 250, "totalMinutes": 0, "averageConfidence": 4}',
             'Great month.') returning id`,
    [player, program, blueprint, published],
  );
  const [{ id: draftReport }] = await sql<{ id: string }>(
    `insert into public.progress_reports (player_id, program_id, blueprint_id, author_id)
     values ($1, $2, $3, ${coachId}) returning id`,
    [player, program, blueprint],
  );

  // Family pages, including a form showing validation errors.
  await signIn(page, parentEmail);
  await audit(page, [
    "/parent",
    `/parent/players/${player}`,
    `/parent/players/${player}/edit`,
    "/parent/players/new",
    `/parent/players/${player}/reports/${report}`,
    "/parent/consent",
    "/parent/account",
    `/parent/players/${player}/check-in`,
  ]);
  await page.getByRole("button", { name: "Submit check-in" }).click();
  await expect(page.getByText("Choose yes or no.")).toBeVisible();
  await expectNoA11yViolations(page);
  await signOut(page, isMobile);

  // Coach pages.
  await signIn(page, coachEmail);
  await audit(page, [
    "/coach",
    `/coach/players/${player}`,
    `/coach/assessments/${draft}`,
    `/coach/assessments/${published}`,
    `/coach/blueprints/${blueprint}`,
    `/coach/programs/${program}`,
    `/coach/sessions/${session}`,
    `/coach/reports/${draftReport}`,
    `/coach/reports/${report}`,
  ]);
  await signOut(page, isMobile);

  // Admin pages.
  await signIn(page, adminEmail);
  await audit(page, [
    "/admin",
    "/admin/programs",
    `/admin/programs/${program}`,
    `/admin/programs/${program}/edit`,
    "/admin/programs/new",
    "/admin/assessments",
    "/admin/reports",
    "/admin/templates",
    `/admin/templates/${template}`,
    "/admin/templates/new",
    "/admin/drills",
    "/admin/drills/new",
    `/admin/drills/${drill}/edit`,
    "/admin/people",
  ]);
});
