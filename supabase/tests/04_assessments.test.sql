-- Sprint 3: drills in Blueprints and the assessment flow a coach uses.
-- All people are fictional fixtures inside a rolled-back transaction.
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

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

grant execute on all functions in schema tests to authenticated;

-- Fixtures: a coach, two families, one program, one active Blueprint with a retired drill.
insert into auth.users (id, email) values
  ('12000000-0000-4000-8000-000000000001', 'coach@example.test'),
  ('12000000-0000-4000-8000-000000000002', 'family.a@example.test'),
  ('12000000-0000-4000-8000-000000000003', 'family.b@example.test');
update public.profiles set role = 'coach' where id = '12000000-0000-4000-8000-000000000001';

insert into public.players (id, first_name, last_name, birth_year, graduation_year, age_group, program,
                            primary_position, experience_level)
values ('22000000-0000-4000-8000-000000000001', 'Test', 'Player', 2012, 2030, 'middle_school', 'boys', 'attack', 'new');
insert into public.parent_player_relationships (parent_id, player_id)
values ('12000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000001');

insert into public.programs (id, name, start_date, end_date, status)
values ('32000000-0000-4000-8000-000000000001', 'Test Program', '2026-10-01', '2026-11-30', 'active');
insert into public.program_coaches (program_id, coach_id)
values ('32000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001');
insert into public.enrollments (program_id, player_id, status)
values ('32000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001', 'active');

insert into public.drills (id, title, skill_category, is_active) values
  ('42000000-0000-4000-8000-000000000001', 'Wall ball (retired)', 'Stick skills', false),
  ('42000000-0000-4000-8000-000000000002', 'Unassigned retired drill', 'Stick skills', false);
insert into public.blueprints (id, player_id, coach_id, status)
values ('52000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001',
        '12000000-0000-4000-8000-000000000001', 'active');
insert into public.blueprint_drills (blueprint_id, drill_id, weekly_reps_target)
values ('52000000-0000-4000-8000-000000000001', '42000000-0000-4000-8000-000000000001', 100);

select tests.as_user('12000000-0000-4000-8000-000000000002');
select results_eq(
  'select id from public.drills',
  $$values ('42000000-0000-4000-8000-000000000001'::uuid)$$,
  'a family sees a retired drill that is assigned to their player, and no other retired drills'
);
reset role;
select tests.clear_claims();

select tests.as_user('12000000-0000-4000-8000-000000000003');
select is(
  (select count(*) from public.drills where not is_active),
  0::bigint,
  'another family cannot see retired drills assigned to someone else'
);
reset role;
select tests.clear_claims();

-- Coach flow: a coach can create and score a baseline for a rostered player.
insert into public.assessment_templates (id, name) values ('62000000-0000-4000-8000-000000000001', 'T');
insert into public.assessment_criteria (id, template_id, category, name)
values ('62000000-0000-4000-8000-000000000002', '62000000-0000-4000-8000-000000000001', 'Stick skills', 'Catching');

select tests.as_user('12000000-0000-4000-8000-000000000001');
select lives_ok(
  $$insert into public.assessments (id, player_id, template_id, assessment_type)
    values ('72000000-0000-4000-8000-000000000001', '22000000-0000-4000-8000-000000000001',
            '62000000-0000-4000-8000-000000000001', 'baseline')$$,
  'an assigned coach can start a baseline assessment'
);
select lives_ok(
  $$insert into public.assessment_scores (assessment_id, criterion_id, rating, comment)
    values ('72000000-0000-4000-8000-000000000001', '62000000-0000-4000-8000-000000000002', 3, 'Solid.')
    on conflict (assessment_id, criterion_id) do update set rating = excluded.rating, comment = excluded.comment$$,
  'the coach can save scores with an upsert'
);
select lives_ok(
  $$update public.assessments set status = 'submitted' where id = '72000000-0000-4000-8000-000000000001'$$,
  'a complete assessment can be submitted'
);
select throws_ok(
  $$insert into public.blueprints (player_id, status) values ('22000000-0000-4000-8000-000000000001', 'active')$$,
  '23505', null,
  'a player can have only one active Blueprint'
);
reset role;
select tests.clear_claims();

select * from finish();
rollback;
