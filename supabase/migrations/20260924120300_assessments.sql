-- Assessments: configurable templates and criteria, assessments and 1-5 scores.
--
-- Templates hold the criteria, and can target an age group and/or position, so
-- PBP can change what is assessed without changing application code.

create table public.assessment_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  description text check (char_length(description) <= 2000),
  age_group public.age_group,
  position public.player_position,
  version integer not null default 1 check (version > 0),
  is_active boolean not null default true,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.assessment_templates is
  'Assessment templates. Owner: administrators. Null age_group/position means the template applies to all.';

create trigger assessment_templates_set_updated_at
  before update on public.assessment_templates
  for each row execute function private.set_updated_at();

create table public.assessment_criteria (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.assessment_templates (id) on delete cascade,
  category text not null check (char_length(category) between 1 and 100),
  name text not null check (char_length(name) between 1 and 200),
  description text check (char_length(description) <= 2000),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.assessment_criteria is
  'Criteria within a template, grouped by category (for example "Stick skills"). Owner: administrators.';

create index assessment_criteria_template_idx on public.assessment_criteria (template_id, sort_order);

create trigger assessment_criteria_set_updated_at
  before update on public.assessment_criteria
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- assessments: one coach assessment of one player. Workflow:
-- draft -> submitted -> approved -> published (see the workflow migration).
-- ---------------------------------------------------------------------------
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  program_id uuid references public.programs (id) on delete set null,
  template_id uuid not null references public.assessment_templates (id) on delete restrict,
  coach_id uuid not null default auth.uid() references public.coaches (profile_id) on delete restrict,
  assessment_type public.assessment_type not null,
  status public.review_status not null default 'draft',
  assessed_on date not null default current_date,
  summary text check (char_length(summary) <= 4000),
  submitted_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.assessments is
  'Coach assessments. Owner: the assessing coach. Parents see an assessment only once it is published.';

create index assessments_player_idx on public.assessments (player_id, assessed_on desc);
create index assessments_program_idx on public.assessments (program_id);
create index assessments_coach_idx on public.assessments (coach_id);
create index assessments_status_idx on public.assessments (status);

create trigger assessments_set_updated_at
  before update on public.assessments
  for each row execute function private.set_updated_at();

create table public.assessment_scores (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments (id) on delete cascade,
  criterion_id uuid not null references public.assessment_criteria (id) on delete restrict,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assessment_id, criterion_id)
);

comment on table public.assessment_scores is
  '1-5 rating and coach comment per criterion. Owned through the parent assessment; editable only while it is a draft. A comment is required on every score before the assessment can be submitted.';

create index assessment_scores_criterion_idx on public.assessment_scores (criterion_id);

create trigger assessment_scores_set_updated_at
  before update on public.assessment_scores
  for each row execute function private.set_updated_at();
