-- Foundation: shared types, the private helper schema, timestamp and audit helpers.
--
-- Conventions used by every migration in this project:
--   * Every table lives in `public`, has Row Level Security enabled, and has no
--     access for the `anon` role. Policies are written for `authenticated` only.
--   * Every table has `created_at`; every mutable table also has `updated_at`,
--     maintained by the `private.set_updated_at()` trigger.
--   * Ownership is recorded in `created_by` (defaulting to the signed-in user)
--     or an equivalent owner column such as `parent_id` or `coach_id`.
--   * Helper functions live in the `private` schema, which is not exposed
--     through the Supabase Data API.

-- ---------------------------------------------------------------------------
-- Private schema for helpers (not exposed through the Data API)
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enumerated types (values come from the project charter)
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('parent', 'coach', 'admin');

create type public.age_group as enum ('youth', 'middle_school', 'high_school');

create type public.lacrosse_program as enum ('boys', 'girls');

create type public.player_position as enum (
  'attack', 'midfield', 'faceoff_draw', 'defense', 'lsm', 'goalie'
);

create type public.experience_level as enum (
  'new', 'one_year', 'two_years', 'three_to_four_years', 'five_plus_years'
);

create type public.guardian_relationship as enum ('parent', 'guardian');

create type public.consent_type as enum ('terms_of_service', 'privacy_policy', 'parental_consent');

create type public.program_status as enum ('draft', 'open', 'active', 'completed', 'archived');

create type public.coach_assignment_role as enum ('lead', 'assistant');

create type public.session_status as enum ('scheduled', 'cancelled', 'completed');

create type public.enrollment_status as enum ('pending', 'active', 'waitlisted', 'withdrawn', 'completed');

create type public.attendance_status as enum ('present', 'absent', 'excused', 'makeup');

create type public.assessment_type as enum ('baseline', 'follow_up');

-- Shared by assessments and progress reports.
create type public.review_status as enum ('draft', 'submitted', 'approved', 'published');

create type public.blueprint_status as enum ('draft', 'active', 'completed', 'archived');

create type public.note_visibility as enum ('parent_visible', 'staff_only');

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Audit trail
--
-- Append-only. Rows are written only by triggers (security definer). Nobody,
-- including administrators, can update or delete them through the API.
-- `details` must never contain names or free text about a player: it records
-- what changed (for example a status transition), not who the player is.
-- ---------------------------------------------------------------------------
create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  player_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.audit_events is
  'Append-only audit trail for publication workflows, role changes, consent and enrollment. Written by triggers only.';

create index audit_events_entity_idx on public.audit_events (entity_table, entity_id);
create index audit_events_player_idx on public.audit_events (player_id);
create index audit_events_created_at_idx on public.audit_events (created_at desc);

create function private.log_audit_event(
  p_action text,
  p_entity_table text,
  p_entity_id uuid,
  p_player_id uuid,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_events (actor_id, action, entity_table, entity_id, player_id, details)
  values (auth.uid(), p_action, p_entity_table, p_entity_id, p_player_id, coalesce(p_details, '{}'::jsonb));
end;
$$;

revoke all on function private.log_audit_event(text, text, uuid, uuid, jsonb) from public;
