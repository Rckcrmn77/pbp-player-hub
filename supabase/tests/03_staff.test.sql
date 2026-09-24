-- Staff management: email visibility and promotion to coach.
-- All people are fictional fixtures inside a rolled-back transaction.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

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

insert into auth.users (id, email) values
  ('11000000-0000-4000-8000-000000000001', 'admin@example.test'),
  ('11000000-0000-4000-8000-000000000002', 'future.coach@example.test'),
  ('11000000-0000-4000-8000-000000000003', 'parent@example.test');
update public.profiles set role = 'admin' where id = '11000000-0000-4000-8000-000000000001';

select is(
  (select email from public.profile_emails where profile_id = '11000000-0000-4000-8000-000000000003'),
  'parent@example.test',
  'a new account''s email is copied for staff lookup'
);

update auth.users set email = 'parent.new@example.test' where id = '11000000-0000-4000-8000-000000000003';
select is(
  (select email from public.profile_emails where profile_id = '11000000-0000-4000-8000-000000000003'),
  'parent.new@example.test',
  'the copy follows email changes'
);

-- Promotion
select tests.as_user('11000000-0000-4000-8000-000000000001');
select lives_ok(
  $$update public.profiles set role = 'coach' where id = '11000000-0000-4000-8000-000000000002'$$,
  'an admin can promote an account to coach'
);
reset role;
select tests.clear_claims();

select ok(
  (select is_active from public.coaches where profile_id = '11000000-0000-4000-8000-000000000002'),
  'promotion creates an active coach record'
);

-- Email visibility
select tests.as_user('11000000-0000-4000-8000-000000000003');
select results_eq(
  'select profile_id from public.profile_emails',
  $$values ('11000000-0000-4000-8000-000000000003'::uuid)$$,
  'a parent sees only their own email'
);
select throws_ok(
  $$update public.profile_emails set email = 'x@example.test'$$,
  '42501', null,
  'nobody edits the email copy through the API'
);
reset role;
select tests.clear_claims();

select tests.as_user('11000000-0000-4000-8000-000000000002');
select is(
  (select count(*) from public.profile_emails where profile_id <> '11000000-0000-4000-8000-000000000002'),
  0::bigint,
  'coaches cannot see other people''s email addresses'
);
reset role;
select tests.clear_claims();

select tests.as_user('11000000-0000-4000-8000-000000000001');
select is(
  (select count(*) from public.profile_emails),
  3::bigint,
  'admins can see every account''s email'
);
reset role;
select tests.clear_claims();

set local role anon;
select throws_ok('select * from public.profile_emails', '42501', null, 'signed-out visitors cannot read emails');
reset role;

select * from finish();
rollback;
