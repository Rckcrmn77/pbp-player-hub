-- Staff management for Sprint 2.
--
-- 1. profile_emails: a copy of each account's sign-in email, readable only by
--    the account itself and administrators, so admins can find people without
--    exposing parents' email addresses to coaches.
-- 2. Promoting an account to coach or admin creates its coach record.

create table public.profile_emails (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profile_emails is
  'Sign-in email for each account, kept in sync from auth.users. Owner: the account. Readable by the account and administrators only.';

create index profile_emails_email_idx on public.profile_emails (lower(email));

create trigger profile_emails_set_updated_at
  before update on public.profile_emails
  for each row execute function private.set_updated_at();

alter table public.profile_emails enable row level security;
revoke all on table public.profile_emails from anon;
revoke insert, update, delete, truncate on public.profile_emails from authenticated;

create policy "emails: own and admins read" on public.profile_emails
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()));

-- Keep the copy in sync with auth.users.
create function private.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null then
    delete from public.profile_emails where profile_id = new.id;
  else
    insert into public.profile_emails (profile_id, email)
    values (new.id, new.email)
    on conflict (profile_id) do update set email = excluded.email;
  end if;
  return new;
end;
$$;

-- Runs after on_auth_user_created (trigger names fire in alphabetical order),
-- so the profile row exists.
create trigger on_auth_user_email_synced
  after insert or update of email on auth.users
  for each row execute function private.sync_profile_email();

-- Backfill accounts created before this migration.
insert into public.profile_emails (profile_id, email)
select u.id, u.email
from auth.users u
join public.profiles p on p.id = u.id
where u.email is not null
on conflict (profile_id) do nothing;

-- ---------------------------------------------------------------------------
-- Promotion to coach or admin creates an (active) coach record.
-- ---------------------------------------------------------------------------
create function private.ensure_coach_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role in ('coach', 'admin') and new.role is distinct from old.role then
    insert into public.coaches (profile_id, created_by)
    values (new.id, auth.uid())
    on conflict (profile_id) do update set is_active = true;
  end if;
  return null;
end;
$$;

create trigger profiles_ensure_coach_record
  after update of role on public.profiles
  for each row execute function private.ensure_coach_record();
