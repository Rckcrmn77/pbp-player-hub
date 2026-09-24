-- Minimal stand-in for the parts of a Supabase database these migrations use,
-- so migrations and pgTAP tests can run on plain PostgreSQL when Docker (and so
-- the real Supabase local stack) is unavailable.
--
-- USED ONLY BY scripts/db/test-without-docker.sh. Never apply this to a real
-- Supabase project: Supabase provides all of this itself. CI runs the same
-- tests against the real Supabase stack (`supabase test db`).

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end;
$$;

do $$
declare
  r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if not pg_has_role(current_user, r, 'member') then
      execute format('grant %I to %I', r, current_user);
    end if;
  end loop;
end;
$$;

create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;
do $$ begin
  execute format('alter database %I set search_path = "$user", public, extensions', current_database());
end; $$;
set search_path = "$user", public, extensions;

-- Supabase grants the API roles broad table privileges and relies on RLS.
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;

create table if not exists auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Same behaviour as Supabase's auth.uid(): the `sub` claim of the request JWT.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;

grant execute on function auth.uid() to anon, authenticated, service_role;
