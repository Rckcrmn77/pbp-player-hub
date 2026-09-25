-- Sprint 4: weekly check-ins and progress reports.
-- All people are fictional fixtures inside a rolled-back transaction.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

create schema tests;
grant usage on schema tests to authenticated;

create function tests.as_user(p_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create function tests.clear_claims()
returns void
language sql
as $$
  select set_config('request.jwt.claims', '', true);
$$;

create function tests.this_week()
returns date
language sql
as $$
  select date_trunc('week', (now() at time zone 'America/New_York')::date)::date;
$$;

grant execute on all functions in schema tests to authenticated;

-- Fixtures: a coach, an unassigned coach, two families (A has a player), an
-- admin, one program, an active Blueprint started four weeks ago.
insert into auth.users (id, email) values
  ('13000000-0000-4000-8000-000000000001', 'coach@example.test'),
  ('13000000-0000-4000-8000-000000000002', 'family.a@example.test'),
  ('13000000-0000-4000-8000-000000000003', 'family.b@example.test'),
  ('13000000-0000-4000-8000-000000000004', 'other.coach@example.test'),
  ('13000000-0000-4000-8000-000000000005', 'admin@example.test');
update public.profiles set role = 'coach'
where id in ('13000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000004');
update public.profiles set role = 'admin' where id = '13000000-0000-4000-8000-000000000005';

insert into public.players (id, first_name, last_name, birth_year, graduation_year, age_group, program,
                            primary_position, experience_level)
values
  ('23000000-0000-4000-8000-000000000001', 'Test', 'Player', 2012, 2030, 'middle_school', 'boys', 'attack', 'new'),
  ('23000000-0000-4000-8000-000000000002', 'Other', 'Player', 2012, 2030, 'middle_school', 'boys', 'attack', 'new');
insert into public.parent_player_relationships (parent_id, player_id) values
  ('13000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000001'),
  ('13000000-0000-4000-8000-000000000003', '23000000-0000-4000-8000-000000000002');

insert into public.programs (id, name, start_date, end_date, status)
values ('33000000-0000-4000-8000-000000000001', 'Test Program', current_date - 30, current_date + 30, 'active');
insert into public.program_coaches (program_id, coach_id)
values ('33000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001');
insert into public.enrollments (program_id, player_id, status) values
  ('33000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001', 'active'),
  ('33000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000002', 'active');

insert into public.blueprints (id, player_id, coach_id, status, start_date) values
  ('53000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001',
   '13000000-0000-4000-8000-000000000001', 'active', tests.this_week() - 28),
  ('53000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000002',
   '13000000-0000-4000-8000-000000000001', 'draft', tests.this_week());

insert into public.assessment_templates (id, name) values ('63000000-0000-4000-8000-000000000001', 'T');
insert into public.assessments (id, player_id, template_id, coach_id, assessment_type, status) values
  ('73000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001',
   '63000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'baseline', 'published'),
  ('73000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000002',
   '63000000-0000-4000-8000-000000000001', '13000000-0000-4000-8000-000000000001', 'baseline', 'published');

-- ---------------------------------------------------------------------------
-- Check-ins
-- ---------------------------------------------------------------------------
select tests.as_user('13000000-0000-4000-8000-000000000002');
select lives_ok(
  $$insert into public.weekly_checkins (blueprint_id, player_id, week_start, assignment_completed,
                                        reps_completed, confidence, reflection, question_for_coach)
    values ('53000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001',
            tests.this_week() - 7, true, 250, 4, 'Left hand feels better.', 'How many reps next week?')$$,
  'a guardian can check in for last week on an active Blueprint'
);
select throws_ok(
  $$insert into public.weekly_checkins (blueprint_id, player_id, week_start, assignment_completed, confidence)
    values ('53000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001',
            tests.this_week() + 7, true, 3)$$,
  '23514', 'Check-ins cannot be for a future week.',
  'a check-in cannot be for a future week'
);
select throws_ok(
  $$insert into public.weekly_checkins (blueprint_id, player_id, week_start, assignment_completed, confidence)
    values ('53000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001',
            tests.this_week() - 35, true, 3)$$,
  '23514', 'Check-ins cannot be for a week before the Blueprint started.',
  'a check-in cannot be for a week before the Blueprint started'
);
select lives_ok(
  $$update public.weekly_checkins set confidence = 5
    where blueprint_id = '53000000-0000-4000-8000-000000000001' and week_start = tests.this_week() - 7$$,
  'the submitter can edit the check-in while the Blueprint is active'
);
reset role;
select tests.clear_claims();

select tests.as_user('13000000-0000-4000-8000-000000000003');
select is((select count(*) from public.weekly_checkins), 0::bigint, 'another family cannot read the check-in');
select throws_ok(
  $$insert into public.weekly_checkins (blueprint_id, player_id, week_start, assignment_completed, confidence)
    values ('53000000-0000-4000-8000-000000000002', '23000000-0000-4000-8000-000000000002',
            tests.this_week(), true, 3)$$,
  '42501', null,
  'a family cannot check in against a draft Blueprint'
);
reset role;
select tests.clear_claims();

select tests.as_user('13000000-0000-4000-8000-000000000001');
select is((select count(*) from public.weekly_checkins), 1::bigint, 'the assigned coach reads the check-in');
reset role;
select tests.clear_claims();

update public.blueprints set status = 'completed' where id = '53000000-0000-4000-8000-000000000001';
select tests.as_user('13000000-0000-4000-8000-000000000002');
update public.weekly_checkins set confidence = 1
where blueprint_id = '53000000-0000-4000-8000-000000000001';
reset role;
select tests.clear_claims();
select is(
  (select confidence from public.weekly_checkins where blueprint_id = '53000000-0000-4000-8000-000000000001'),
  5::smallint,
  'check-ins are locked once the Blueprint is no longer active'
);

-- ---------------------------------------------------------------------------
-- Progress reports
-- ---------------------------------------------------------------------------
select tests.as_user('13000000-0000-4000-8000-000000000001');
select throws_ok(
  $$insert into public.progress_reports (player_id, baseline_assessment_id)
    values ('23000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000002')$$,
  '23514', 'The report''s assessments must belong to the same player.',
  'a report cannot link another player''s assessment'
);
select lives_ok(
  $$insert into public.progress_reports (id, player_id, blueprint_id, baseline_assessment_id, rating_changes)
    values ('83000000-0000-4000-8000-000000000001', '23000000-0000-4000-8000-000000000001',
            '53000000-0000-4000-8000-000000000001', '73000000-0000-4000-8000-000000000001',
            '[{"category": "Stick skills", "baseline": 3, "current": 4}]')$$,
  'the assigned coach can start a report'
);
select throws_ok(
  $$update public.progress_reports set status = 'submitted' where id = '83000000-0000-4000-8000-000000000001'$$,
  '23514', 'Add coach observations before submitting.',
  'a report needs coach observations before it is submitted'
);
update public.progress_reports set coach_observations = 'Great month.'
where id = '83000000-0000-4000-8000-000000000001';
update public.progress_reports set status = 'submitted' where id = '83000000-0000-4000-8000-000000000001';
update public.progress_reports set status = 'approved' where id = '83000000-0000-4000-8000-000000000001';
reset role;
select tests.clear_claims();

select tests.as_user('13000000-0000-4000-8000-000000000002');
select is((select count(*) from public.progress_reports), 0::bigint, 'families cannot see an approved, unpublished report');
reset role;
select tests.clear_claims();

select tests.as_user('13000000-0000-4000-8000-000000000004');
select is((select count(*) from public.progress_reports), 0::bigint, 'an unassigned coach cannot see the report');
reset role;
select tests.clear_claims();

select tests.as_user('13000000-0000-4000-8000-000000000005');
update public.progress_reports set status = 'published' where id = '83000000-0000-4000-8000-000000000001';
reset role;
select tests.clear_claims();

select tests.as_user('13000000-0000-4000-8000-000000000002');
select is(
  (select coach_observations from public.progress_reports),
  'Great month.',
  'the family reads the report once an administrator publishes it'
);
reset role;
select tests.clear_claims();

select * from finish();
rollback;
