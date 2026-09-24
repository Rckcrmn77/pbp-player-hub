-- Programs: programs, coach assignments, sessions, enrollments, attendance.

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  location text check (char_length(location) <= 200),
  age_group public.age_group,
  program public.lacrosse_program,
  start_date date not null,
  end_date date not null,
  schedule_description text check (char_length(schedule_description) <= 1000),
  registration_url text check (registration_url ~ '^https://'),
  status public.program_status not null default 'draft',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint programs_dates_ordered check (end_date >= start_date)
);

comment on table public.programs is
  'PBP programs (clinics, training cycles). Owner: administrators. Payment happens outside the app via registration_url.';
comment on column public.programs.age_group is 'Null means open to all age groups.';
comment on column public.programs.program is 'Boys or girls lacrosse. Null means both.';

create index programs_status_idx on public.programs (status);

create trigger programs_set_updated_at
  before update on public.programs
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- program_coaches: which coaches are assigned to which programs.
-- (Not in the charter's minimum list; needed for "assigned coaches".)
-- ---------------------------------------------------------------------------
create table public.program_coaches (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  coach_id uuid not null references public.coaches (profile_id) on delete cascade,
  assignment_role public.coach_assignment_role not null default 'assistant',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, coach_id)
);

comment on table public.program_coaches is 'Coach assignments to programs. Owner: administrators.';

create index program_coaches_coach_idx on public.program_coaches (coach_id);

create trigger program_coaches_set_updated_at
  before update on public.program_coaches
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- program_sessions: individual training sessions within a program.
-- ---------------------------------------------------------------------------
create table public.program_sessions (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text check (char_length(location) <= 200),
  status public.session_status not null default 'scheduled',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_sessions_times_ordered check (ends_at > starts_at)
);

comment on table public.program_sessions is 'Scheduled sessions. Owner: administrators; assigned coaches may update status.';

create index program_sessions_program_idx on public.program_sessions (program_id, starts_at);

create trigger program_sessions_set_updated_at
  before update on public.program_sessions
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- enrollments: a player's place on a program roster.
-- ---------------------------------------------------------------------------
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  status public.enrollment_status not null default 'pending',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, player_id)
);

comment on table public.enrollments is 'Program rosters. Owner: administrators.';

create index enrollments_player_idx on public.enrollments (player_id);

create trigger enrollments_set_updated_at
  before update on public.enrollments
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- attendance: one row per player per session.
-- ---------------------------------------------------------------------------
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.program_sessions (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  status public.attendance_status not null,
  recorded_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, player_id)
);

comment on table public.attendance is 'Session attendance. Owner: the coach who recorded it; editable by assigned coaches and administrators.';

create index attendance_player_idx on public.attendance (player_id);

create trigger attendance_set_updated_at
  before update on public.attendance
  for each row execute function private.set_updated_at();
