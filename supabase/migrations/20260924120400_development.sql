-- Development plan: drill library, Blueprints, priorities, assigned drills,
-- weekly check-ins, coach notes, progress reports.

create table public.drills (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 4000),
  coaching_points text check (char_length(coaching_points) <= 4000),
  positions public.player_position[] not null default '{}',
  age_groups public.age_group[] not null default '{}',
  skill_category text not null check (char_length(skill_category) between 1 and 100),
  equipment text check (char_length(equipment) <= 500),
  target_reps integer check (target_reps > 0),
  target_minutes integer check (target_minutes > 0),
  video_url text check (video_url ~ '^https://'),
  is_active boolean not null default true,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.drills is
  'Drill library. Owner: administrators. Empty positions/age_groups arrays mean the drill applies to all.';

create index drills_skill_category_idx on public.drills (skill_category) where is_active;

create trigger drills_set_updated_at
  before update on public.drills
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- blueprints: a player's development plan for a cycle.
-- ---------------------------------------------------------------------------
create table public.blueprints (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  program_id uuid references public.programs (id) on delete set null,
  baseline_assessment_id uuid references public.assessments (id) on delete set null,
  coach_id uuid not null default auth.uid() references public.coaches (profile_id) on delete restrict,
  status public.blueprint_status not null default 'draft',
  player_goals text check (char_length(player_goals) <= 2000),
  coach_summary text check (char_length(coach_summary) <= 4000),
  start_date date not null default current_date,
  review_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blueprints_dates_ordered check (review_date is null or review_date >= start_date)
);

comment on table public.blueprints is
  'Player development plans. Owner: the coach. Parents see non-draft Blueprints for their players.';

create unique index blueprints_one_active_per_player on public.blueprints (player_id) where status = 'active';
create index blueprints_player_idx on public.blueprints (player_id);
create index blueprints_program_idx on public.blueprints (program_id);

create trigger blueprints_set_updated_at
  before update on public.blueprints
  for each row execute function private.set_updated_at();

-- Up to three ranked priorities per Blueprint.
create table public.blueprint_priorities (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid not null references public.blueprints (id) on delete cascade,
  rank smallint not null check (rank between 1 and 3),
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (blueprint_id, rank)
);

comment on table public.blueprint_priorities is 'Ranked development priorities (1-3). Owned through the Blueprint.';

create trigger blueprint_priorities_set_updated_at
  before update on public.blueprint_priorities
  for each row execute function private.set_updated_at();

-- Drills assigned from the library, with weekly targets.
create table public.blueprint_drills (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid not null references public.blueprints (id) on delete cascade,
  drill_id uuid not null references public.drills (id) on delete restrict,
  weekly_reps_target integer check (weekly_reps_target > 0),
  weekly_minutes_target integer check (weekly_minutes_target > 0),
  is_at_home boolean not null default true,
  instructions text check (char_length(instructions) <= 2000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (blueprint_id, drill_id)
);

comment on table public.blueprint_drills is 'Drills assigned to a Blueprint with weekly targets. Owned through the Blueprint.';

create index blueprint_drills_drill_idx on public.blueprint_drills (drill_id);

create trigger blueprint_drills_set_updated_at
  before update on public.blueprint_drills
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- weekly_checkins: submitted by the parent, with or for the player.
-- ---------------------------------------------------------------------------
create table public.weekly_checkins (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid not null references public.blueprints (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  assignment_completed boolean not null,
  reps_completed integer check (reps_completed >= 0),
  minutes_completed integer check (minutes_completed >= 0),
  confidence smallint not null check (confidence between 1 and 5),
  reflection text check (char_length(reflection) <= 2000),
  question_for_coach text check (char_length(question_for_coach) <= 1000),
  submitted_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (blueprint_id, week_start)
);

comment on table public.weekly_checkins is
  'Weekly player check-ins. Owner: the submitting parent. week_start is the Monday of the week.';
comment on column public.weekly_checkins.created_at is 'Submission date.';

create index weekly_checkins_player_idx on public.weekly_checkins (player_id, week_start desc);

create trigger weekly_checkins_set_updated_at
  before update on public.weekly_checkins
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- coach_notes: parent-visible or staff-only notes about a player.
-- ---------------------------------------------------------------------------
create table public.coach_notes (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  program_id uuid references public.programs (id) on delete set null,
  session_id uuid references public.program_sessions (id) on delete set null,
  author_id uuid not null default auth.uid() references public.coaches (profile_id) on delete restrict,
  visibility public.note_visibility not null default 'staff_only',
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.coach_notes is
  'Coach notes. Owner: the author. Defaults to staff-only; parents see only parent-visible notes.';

create index coach_notes_player_idx on public.coach_notes (player_id, created_at desc);
create index coach_notes_author_idx on public.coach_notes (author_id);

create trigger coach_notes_set_updated_at
  before update on public.coach_notes
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- progress_reports: end-of-cycle reports. Same workflow as assessments.
-- Summary figures are snapshots taken when the report is written, so a
-- published report does not change if later data changes.
-- ---------------------------------------------------------------------------
create table public.progress_reports (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  program_id uuid references public.programs (id) on delete set null,
  blueprint_id uuid references public.blueprints (id) on delete set null,
  baseline_assessment_id uuid references public.assessments (id) on delete set null,
  current_assessment_id uuid references public.assessments (id) on delete set null,
  author_id uuid not null default auth.uid() references public.coaches (profile_id) on delete restrict,
  status public.review_status not null default 'draft',
  rating_changes jsonb not null default '[]'::jsonb,
  attendance_summary jsonb not null default '{}'::jsonb,
  work_summary jsonb not null default '{}'::jsonb,
  coach_observations text check (char_length(coach_observations) <= 4000),
  strengths text check (char_length(strengths) <= 2000),
  next_priorities text check (char_length(next_priorities) <= 2000),
  action_plan_30_day text check (char_length(action_plan_30_day) <= 4000),
  recommended_program_id uuid references public.programs (id) on delete set null,
  submitted_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.progress_reports is
  'Progress reports. Owner: the authoring coach. Parents see a report only once it is published.';

create index progress_reports_player_idx on public.progress_reports (player_id, created_at desc);
create index progress_reports_program_idx on public.progress_reports (program_id);
create index progress_reports_status_idx on public.progress_reports (status);

create trigger progress_reports_set_updated_at
  before update on public.progress_reports
  for each row execute function private.set_updated_at();
