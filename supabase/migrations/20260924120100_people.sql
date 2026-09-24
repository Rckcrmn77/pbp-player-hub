-- People: profiles, coaches, players, parent-player relationships, consent.

-- ---------------------------------------------------------------------------
-- profiles: one row per sign-in account (auth.users). Holds the app role.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null default 'parent',
  first_name text not null default '' check (char_length(first_name) <= 100),
  last_name text not null default '' check (char_length(last_name) <= 100),
  phone text check (char_length(phone) <= 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'App profile for each account. Owner: the account itself. The role can only be changed by an administrator.';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- Every new account starts as a parent. The role is never taken from sign-up
-- metadata, because that metadata is supplied by the person signing up.
-- Names are copied from metadata when present, for convenience only.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, first_name, last_name)
  values (
    new.id,
    'parent',
    left(coalesce(new.raw_user_meta_data ->> 'first_name', ''), 100),
    left(coalesce(new.raw_user_meta_data ->> 'last_name', ''), 100)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ---------------------------------------------------------------------------
-- coaches: staff details for accounts with the coach (or admin) role.
-- ---------------------------------------------------------------------------
create table public.coaches (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  bio text check (char_length(bio) <= 2000),
  is_active boolean not null default true,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.coaches is
  'Coach details. Owner: administrators. A coach may edit their own bio.';

create trigger coaches_set_updated_at
  before update on public.coaches
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- players: athlete profiles. Players do not have their own accounts.
-- ---------------------------------------------------------------------------
create table public.players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (char_length(first_name) between 1 and 100),
  last_name text not null check (char_length(last_name) between 1 and 100),
  birth_year smallint not null check (birth_year between 2005 and 2025),
  graduation_year smallint not null check (graduation_year between 2027 and 2038),
  age_group public.age_group not null,
  program public.lacrosse_program not null,
  primary_position public.player_position not null,
  secondary_position public.player_position,
  experience_level public.experience_level not null,
  team_or_school text check (char_length(team_or_school) <= 200),
  goals text check (char_length(goals) <= 2000),
  strengths text check (char_length(strengths) <= 2000),
  improvement_areas text check (char_length(improvement_areas) <= 2000),
  emergency_contact_name text check (char_length(emergency_contact_name) <= 200),
  emergency_contact_phone text check (char_length(emergency_contact_phone) <= 30),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint players_secondary_differs check (secondary_position is distinct from primary_position)
);

comment on table public.players is
  'Athlete profiles. Owner: the linked parents/guardians (parent_player_relationships).';

create index players_created_by_idx on public.players (created_by);

create trigger players_set_updated_at
  before update on public.players
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- parent_player_relationships: which accounts manage which players.
-- Many-to-many so two guardians can share a player.
-- ---------------------------------------------------------------------------
create table public.parent_player_relationships (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null references public.profiles (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  relationship public.guardian_relationship not null default 'parent',
  is_primary boolean not null default false,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id, player_id)
);

comment on table public.parent_player_relationships is
  'Links parent/guardian accounts to players. Created automatically when a parent adds a player; other links are created by administrators.';

create index parent_player_relationships_player_idx on public.parent_player_relationships (player_id);

create trigger parent_player_relationships_set_updated_at
  before update on public.parent_player_relationships
  for each row execute function private.set_updated_at();

-- When a parent creates a player, link the player to that parent as the primary
-- guardian. Administrators creating players link guardians separately.
create function private.link_new_player_to_creator()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.profiles where id = auth.uid() and role = 'parent') then
    insert into public.parent_player_relationships (parent_id, player_id, relationship, is_primary, created_by)
    values (auth.uid(), new.id, 'parent', true, auth.uid());
  end if;
  return new;
end;
$$;

create trigger players_link_to_creator
  after insert on public.players
  for each row execute function private.link_new_player_to_creator();

-- ---------------------------------------------------------------------------
-- consent_records: append-only record of consent given or withdrawn.
-- The latest row per (parent, player, consent type) is the current state.
-- ---------------------------------------------------------------------------
create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  player_id uuid references public.players (id) on delete cascade,
  consent_type public.consent_type not null,
  document_version text not null check (char_length(document_version) between 1 and 50),
  granted boolean not null,
  created_at timestamptz not null default now()
);

comment on table public.consent_records is
  'Append-only consent history. Owner: the parent who gave or withdrew consent. Rows are never updated or deleted through the API.';

create index consent_records_parent_idx on public.consent_records (parent_id, consent_type, created_at desc);
create index consent_records_player_idx on public.consent_records (player_id);
