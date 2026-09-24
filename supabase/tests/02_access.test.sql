-- Access rules and workflows, exercised as real signed-in users.
--
-- All people and players below are fictional test fixtures and exist only
-- inside this transaction, which is rolled back at the end.
begin;
create extension if not exists pgtap with schema extensions;

select plan(54);

-- ---------------------------------------------------------------------------
-- Test helpers
-- ---------------------------------------------------------------------------
create schema tests;
grant usage on schema tests to anon, authenticated;

create function tests.create_user(p_id uuid, p_role public.app_role, p_metadata jsonb default '{}')
returns void
language plpgsql
as $$
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (p_id, p_id::text || '@example.test', p_metadata);
  update public.profiles set role = p_role where id = p_id;
  if p_role in ('coach', 'admin') then
    insert into public.coaches (profile_id) values (p_id);
  end if;
end;
$$;

-- Act as a signed-in user for the rest of the transaction (until reset).
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

grant execute on all functions in schema tests to anon, authenticated;

-- Readable fixture ids
create temp table ids (name text primary key, id uuid not null);
grant select on ids to anon, authenticated;
insert into ids values
  ('admin',      '10000000-0000-4000-8000-000000000001'),
  ('coach1',     '10000000-0000-4000-8000-000000000002'),
  ('coach2',     '10000000-0000-4000-8000-000000000003'),
  ('parentA',    '10000000-0000-4000-8000-000000000004'),
  ('parentB',    '10000000-0000-4000-8000-000000000005'),
  ('guardianA2', '10000000-0000-4000-8000-000000000006'),
  ('newUser',    '10000000-0000-4000-8000-000000000007'),
  ('playerA',    '20000000-0000-4000-8000-000000000001'),
  ('playerB',    '20000000-0000-4000-8000-000000000002'),
  ('playerA2',   '20000000-0000-4000-8000-000000000003'),
  ('program1',   '30000000-0000-4000-8000-000000000001'),
  ('program2',   '30000000-0000-4000-8000-000000000002'),
  ('draftProg',  '30000000-0000-4000-8000-000000000003'),
  ('session1',   '40000000-0000-4000-8000-000000000001'),
  ('template',   '50000000-0000-4000-8000-000000000001'),
  ('critA',      '50000000-0000-4000-8000-000000000002'),
  ('critB',      '50000000-0000-4000-8000-000000000003'),
  ('draftAsmt',  '60000000-0000-4000-8000-000000000001'),
  ('pubAsmt',    '60000000-0000-4000-8000-000000000002'),
  ('staffNote',  '70000000-0000-4000-8000-000000000001'),
  ('parentNote', '70000000-0000-4000-8000-000000000002'),
  ('blueprintA', '80000000-0000-4000-8000-000000000001'),
  ('report',     '90000000-0000-4000-8000-000000000001');

create function tests.id(p_name text)
returns uuid
language sql
stable
as $$
  select id from ids where name = p_name;
$$;

-- ---------------------------------------------------------------------------
-- Fixtures (created as the database owner, so no policies apply)
-- ---------------------------------------------------------------------------
select tests.create_user(tests.id('admin'), 'admin');
select tests.create_user(tests.id('coach1'), 'coach');
select tests.create_user(tests.id('coach2'), 'coach');
select tests.create_user(tests.id('parentA'), 'parent');
select tests.create_user(tests.id('parentB'), 'parent');
select tests.create_user(tests.id('guardianA2'), 'parent');

insert into public.players (id, first_name, last_name, birth_year, graduation_year, age_group, program,
                            primary_position, experience_level)
values
  (tests.id('playerA'), 'Test', 'Player A', 2012, 2030, 'middle_school', 'boys', 'attack', 'two_years'),
  (tests.id('playerB'), 'Test', 'Player B', 2013, 2031, 'middle_school', 'girls', 'defense', 'new');

insert into public.parent_player_relationships (parent_id, player_id, is_primary) values
  (tests.id('parentA'), tests.id('playerA'), true),
  (tests.id('guardianA2'), tests.id('playerA'), false),
  (tests.id('parentB'), tests.id('playerB'), true);

insert into public.programs (id, name, start_date, end_date, status) values
  (tests.id('program1'), 'Test Program 1', '2026-10-01', '2026-11-30', 'active'),
  (tests.id('program2'), 'Test Program 2', '2026-10-01', '2026-11-30', 'active'),
  (tests.id('draftProg'), 'Draft Program', '2027-01-01', '2027-02-28', 'draft');

insert into public.program_coaches (program_id, coach_id, assignment_role) values
  (tests.id('program1'), tests.id('coach1'), 'lead'),
  (tests.id('program2'), tests.id('coach2'), 'lead');

insert into public.enrollments (program_id, player_id, status) values
  (tests.id('program1'), tests.id('playerA'), 'active'),
  (tests.id('program2'), tests.id('playerB'), 'active');

insert into public.program_sessions (id, program_id, starts_at, ends_at) values
  (tests.id('session1'), tests.id('program1'), '2026-10-05 17:00-04', '2026-10-05 18:30-04');

insert into public.assessment_templates (id, name) values (tests.id('template'), 'Test template');
insert into public.assessment_criteria (id, template_id, category, name, sort_order) values
  (tests.id('critA'), tests.id('template'), 'Stick skills', 'Catching', 1),
  (tests.id('critB'), tests.id('template'), 'Footwork and athletic movement', 'Change of direction', 2);

insert into public.assessments (id, player_id, program_id, template_id, coach_id, assessment_type, status) values
  (tests.id('draftAsmt'), tests.id('playerA'), tests.id('program1'), tests.id('template'), tests.id('coach1'), 'follow_up', 'draft'),
  (tests.id('pubAsmt'), tests.id('playerA'), tests.id('program1'), tests.id('template'), tests.id('coach1'), 'baseline', 'published');

insert into public.coach_notes (id, player_id, author_id, visibility, body) values
  (tests.id('staffNote'), tests.id('playerA'), tests.id('coach1'), 'staff_only', 'Staff-only observation.'),
  (tests.id('parentNote'), tests.id('playerA'), tests.id('coach1'), 'parent_visible', 'Great effort this week.');

insert into public.blueprints (id, player_id, program_id, coach_id, status) values
  (tests.id('blueprintA'), tests.id('playerA'), tests.id('program1'), tests.id('coach1'), 'active');

insert into public.progress_reports (id, player_id, program_id, author_id) values
  (tests.id('report'), tests.id('playerA'), tests.id('program1'), tests.id('coach1'));

-- ===========================================================================
-- Sign-up and roles
-- ===========================================================================
insert into auth.users (id, email, raw_user_meta_data)
values (tests.id('newUser'), 'new@example.test', '{"role": "admin", "first_name": "New"}');

select is(
  (select role from public.profiles where id = tests.id('newUser')),
  'parent'::public.app_role,
  'a new account is always a parent, even if sign-up metadata asks for admin'
);

select tests.as_user(tests.id('parentA'));
select throws_ok(
  format($$update public.profiles set role = 'admin' where id = %L$$, tests.id('parentA')),
  '42501', null,
  'a parent cannot make themselves an admin'
);
reset role;
select tests.clear_claims();

select tests.as_user(tests.id('admin'));
select lives_ok(
  format($$update public.profiles set role = 'coach' where id = %L$$, tests.id('newUser')),
  'an admin can change another account''s role'
);
select throws_ok(
  format($$update public.profiles set role = 'parent' where id = %L$$, tests.id('admin')),
  '42501', null,
  'an admin cannot change their own role'
);
reset role;
select tests.clear_claims();

select is(
  (select count(*) from public.audit_events where action = 'role_changed' and entity_id = tests.id('newUser')),
  1::bigint,
  'role changes are written to the audit trail'
);

-- ===========================================================================
-- Signed-out visitors
-- ===========================================================================
set local role anon;
select throws_ok('select * from public.players', '42501', null, 'signed-out visitors cannot read players');
select throws_ok('select * from public.programs', '42501', null, 'signed-out visitors cannot read programs');
reset role;

-- ===========================================================================
-- Families only see their own players
-- ===========================================================================
select tests.as_user(tests.id('parentA'));
select results_eq(
  'select id from public.players order by id',
  array[tests.id('playerA')],
  'parent A sees only their own player'
);
select is(
  (select count(*) from public.players where id = tests.id('playerB')),
  0::bigint,
  'parent A cannot see another family''s player, even by id'
);
select is(
  (select count(*) from public.parent_player_relationships where player_id = tests.id('playerB')),
  0::bigint,
  'parent A cannot see another family''s guardian links'
);
select lives_ok(
  format($$insert into public.players (id, first_name, last_name, birth_year, graduation_year, age_group, program,
                                       primary_position, experience_level)
           values (%L, 'Test', 'Sibling', 2016, 2034, 'youth', 'boys', 'midfield', 'new')$$, tests.id('playerA2')),
  'a parent can add a player'
);
select is(
  (select count(*) from public.players),
  2::bigint,
  'a new player is linked to the parent who added it'
);
select throws_ok(
  format($$insert into public.parent_player_relationships (parent_id, player_id) values (%L, %L)$$,
         tests.id('parentA'), tests.id('playerB')),
  '42501', null,
  'a parent cannot link themselves to another family''s player'
);
update public.players set goals = 'changed by someone else' where id = tests.id('playerB');
delete from public.players where id = tests.id('playerA');
select lives_ok(
  format($$insert into public.consent_records (player_id, consent_type, document_version, granted)
           values (%L, 'parental_consent', 'draft-1', true)$$, tests.id('playerA')),
  'a parent can record consent for their own player'
);
select throws_ok(
  format($$insert into public.consent_records (player_id, consent_type, document_version, granted)
           values (%L, 'parental_consent', 'draft-1', true)$$, tests.id('playerB')),
  '42501', null,
  'a parent cannot record consent for another family''s player'
);
select throws_ok(
  'update public.consent_records set granted = false',
  '42501', null,
  'consent records cannot be edited after they are written'
);
reset role;
select tests.clear_claims();

select is(
  (select goals from public.players where id = tests.id('playerB')),
  null,
  'a parent cannot edit another family''s player'
);
select is(
  (select count(*) from public.players where id = tests.id('playerA')),
  1::bigint,
  'a parent cannot delete a player (deletion goes through an admin)'
);

select tests.as_user(tests.id('guardianA2'));
select results_eq(
  'select id from public.players order by id',
  array[tests.id('playerA')],
  'a second guardian sees the shared player'
);
reset role;
select tests.clear_claims();

select tests.as_user(tests.id('parentB'));
select results_eq(
  'select id from public.players order by id',
  array[tests.id('playerB')],
  'parent B sees only their own player'
);
reset role;
select tests.clear_claims();

-- ===========================================================================
-- Coaches see only their rosters
-- ===========================================================================
select tests.as_user(tests.id('coach1'));
select results_eq(
  'select id from public.players order by id',
  array[tests.id('playerA')],
  'coach 1 sees only players enrolled in their programs'
);
select is(
  (select count(*) from public.coach_notes where player_id = tests.id('playerA')),
  2::bigint,
  'a coach sees staff-only and parent-visible notes for their players'
);
select throws_ok(
  format($$insert into public.coach_notes (player_id, visibility, body) values (%L, 'staff_only', 'x')$$,
         tests.id('playerB')),
  '42501', null,
  'a coach cannot write notes about players outside their programs'
);
select lives_ok(
  format($$insert into public.attendance (session_id, player_id, status) values (%L, %L, 'present')$$,
         tests.id('session1'), tests.id('playerA')),
  'an assigned coach can record attendance'
);
select throws_ok(
  format($$insert into public.attendance (session_id, player_id, status) values (%L, %L, 'present')$$,
         tests.id('session1'), tests.id('playerB')),
  '42501', null,
  'attendance can only be recorded for players enrolled in the session''s program'
);
reset role;
select tests.clear_claims();

select tests.as_user(tests.id('coach2'));
select results_eq(
  'select id from public.players order by id',
  array[tests.id('playerB')],
  'coach 2 sees only their own roster'
);
select is(
  (select count(*) from public.coach_notes where player_id = tests.id('playerA')),
  0::bigint,
  'a coach cannot read notes about players outside their programs'
);
select throws_ok(
  format($$insert into public.attendance (session_id, player_id, status) values (%L, %L, 'absent')$$,
         tests.id('session1'), tests.id('playerA')),
  '42501', null,
  'a coach cannot record attendance for another coach''s session'
);
reset role;
select tests.clear_claims();

update public.enrollments set status = 'withdrawn'
where program_id = tests.id('program1') and player_id = tests.id('playerA');
select tests.as_user(tests.id('coach1'));
select is(
  (select count(*) from public.players),
  0::bigint,
  'a coach loses access when the player withdraws from their program'
);
reset role;
select tests.clear_claims();
update public.enrollments set status = 'active'
where program_id = tests.id('program1') and player_id = tests.id('playerA');

-- Parents see parent-visible notes only.
select tests.as_user(tests.id('parentA'));
select results_eq(
  'select id from public.coach_notes order by id',
  array[tests.id('parentNote')],
  'parents see parent-visible notes and not staff-only notes'
);
reset role;
select tests.clear_claims();

-- ===========================================================================
-- Assessment workflow: draft -> submitted -> approved -> published
-- ===========================================================================
select tests.as_user(tests.id('parentA'));
select results_eq(
  'select id from public.assessments order by id',
  array[tests.id('pubAsmt')],
  'parents see published assessments and not drafts'
);
select throws_ok(
  format($$insert into public.assessments (player_id, template_id, coach_id, assessment_type)
           values (%L, %L, %L, 'baseline')$$, tests.id('playerA'), tests.id('template'), tests.id('coach1')),
  '42501', null,
  'parents cannot create assessments'
);
reset role;
select tests.clear_claims();

select tests.as_user(tests.id('coach1'));
select throws_ok(
  format($$insert into public.assessments (player_id, template_id, assessment_type, status)
           values (%L, %L, 'baseline', 'published')$$, tests.id('playerA'), tests.id('template')),
  '42501', null,
  'a coach cannot create an assessment that skips review'
);
select lives_ok(
  format($$insert into public.assessment_scores (assessment_id, criterion_id, rating, comment)
           values (%L, %L, 4, 'Soft hands on the catch.')$$, tests.id('draftAsmt'), tests.id('critA')),
  'the assessing coach can score a draft'
);
select throws_ok(
  format($$update public.assessments set status = 'submitted' where id = %L$$, tests.id('draftAsmt')),
  '23514', null,
  'an assessment cannot be submitted until every criterion has a rating and comment'
);
select lives_ok(
  format($$insert into public.assessment_scores (assessment_id, criterion_id, rating, comment)
           values (%L, %L, 3, 'Work on planting the outside foot.')$$, tests.id('draftAsmt'), tests.id('critB')),
  'the coach completes the scores'
);
select lives_ok(
  format($$update public.assessments set status = 'submitted' where id = %L$$, tests.id('draftAsmt')),
  'a complete assessment can be submitted'
);
select throws_ok(
  format($$update public.assessments set summary = 'edited after submitting' where id = %L$$, tests.id('draftAsmt')),
  '42501', null,
  'a submitted assessment can no longer be edited'
);
select lives_ok(
  format($$update public.assessments set status = 'approved' where id = %L$$, tests.id('draftAsmt')),
  'an assigned coach can approve'
);
select throws_ok(
  format($$update public.assessments set status = 'published' where id = %L$$, tests.id('draftAsmt')),
  '42501', null,
  'a coach cannot publish'
);
reset role;
select tests.clear_claims();

select tests.as_user(tests.id('admin'));
select lives_ok(
  format($$update public.assessments set status = 'published' where id = %L$$, tests.id('draftAsmt')),
  'an admin can publish an approved assessment'
);
update public.assessment_scores set rating = 1 where assessment_id = tests.id('draftAsmt');
reset role;
select tests.clear_claims();

select ok(
  (select published_by = tests.id('admin') and published_at is not null and approved_by = tests.id('coach1')
   from public.assessments where id = tests.id('draftAsmt')),
  'approval and publication record who did it and when'
);
select is(
  (select array_agg(details ->> 'to' order by id) from public.audit_events
   where entity_table = 'assessments' and entity_id = tests.id('draftAsmt') and action = 'status_changed'),
  array['submitted', 'approved', 'published'],
  'every workflow step is written to the audit trail'
);
select is(
  (select array_agg(rating order by rating) from public.assessment_scores where assessment_id = tests.id('draftAsmt')),
  array[3, 4]::smallint[],
  'scores of a published assessment cannot be changed, even by an admin'
);

select tests.as_user(tests.id('parentA'));
select is(
  (select count(*) from public.assessments),
  2::bigint,
  'parents see the assessment once it is published'
);
reset role;
select tests.clear_claims();

-- ===========================================================================
-- Progress report workflow
-- ===========================================================================
select tests.as_user(tests.id('coach1'));
select throws_ok(
  format($$update public.progress_reports set status = 'submitted' where id = %L$$, tests.id('report')),
  '23514', null,
  'a report cannot be submitted without coach observations'
);
update public.progress_reports set coach_observations = 'Strong progress in stick skills.' where id = tests.id('report');
update public.progress_reports set status = 'submitted' where id = tests.id('report');
update public.progress_reports set status = 'approved' where id = tests.id('report');
reset role;
select tests.clear_claims();

select tests.as_user(tests.id('parentA'));
select is(
  (select count(*) from public.progress_reports),
  0::bigint,
  'parents cannot see an approved report before it is published'
);
reset role;
select tests.clear_claims();

select tests.as_user(tests.id('admin'));
update public.progress_reports set status = 'published' where id = tests.id('report');
reset role;
select tests.clear_claims();

select tests.as_user(tests.id('parentA'));
select is(
  (select count(*) from public.progress_reports),
  1::bigint,
  'parents see the report once an admin publishes it'
);
reset role;
select tests.clear_claims();

-- ===========================================================================
-- Blueprints and weekly check-ins
-- ===========================================================================
select tests.as_user(tests.id('parentA'));
select lives_ok(
  format($$insert into public.weekly_checkins (blueprint_id, player_id, week_start, assignment_completed, confidence)
           values (%L, %L, '2026-10-05', true, 4)$$, tests.id('blueprintA'), tests.id('playerA')),
  'a parent can submit a weekly check-in for their player'
);
reset role;
select tests.clear_claims();

select tests.as_user(tests.id('parentB'));
select is(
  (select count(*) from public.blueprints),
  0::bigint,
  'parents cannot see another family''s Blueprint'
);
select throws_ok(
  format($$insert into public.weekly_checkins (blueprint_id, player_id, week_start, assignment_completed, confidence)
           values (%L, %L, '2026-10-12', true, 4)$$, tests.id('blueprintA'), tests.id('playerA')),
  '42501', null,
  'a parent cannot submit a check-in for another family''s player'
);
reset role;
select tests.clear_claims();

select tests.as_user(tests.id('coach2'));
select is(
  (select count(*) from public.weekly_checkins),
  0::bigint,
  'coaches cannot see check-ins for players outside their programs'
);
reset role;
select tests.clear_claims();

-- ===========================================================================
-- Programs and the audit trail
-- ===========================================================================
select tests.as_user(tests.id('parentA'));
select is(
  (select count(*) from public.programs),
  2::bigint,
  'parents see open and active programs but not drafts'
);
select is(
  (select count(*) from public.audit_events),
  0::bigint,
  'parents cannot read the audit trail'
);
reset role;
select tests.clear_claims();

select * from finish();
rollback;
