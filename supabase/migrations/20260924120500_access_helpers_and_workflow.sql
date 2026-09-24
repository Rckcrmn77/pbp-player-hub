-- Access helpers, workflow rules and audit triggers.
--
-- The helpers answer "who is the signed-in user to this record?" and are used
-- by the Row Level Security policies in the next migration. They are SECURITY
-- DEFINER so a policy on one table can check another table without recursing
-- into that table's policies, and they live in the `private` schema so they
-- are not callable through the Data API.
--
-- Triggers below skip their checks when there is no signed-in user
-- (auth.uid() is null). That only happens for trusted server-side access
-- (service role, migrations, seeds, tests run as the database owner), which
-- also bypasses Row Level Security.

-- ---------------------------------------------------------------------------
-- Role helpers
-- ---------------------------------------------------------------------------
create function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_app_role() = 'admin', false);
$$;

-- An active coach account (administrators with an active coach record count too).
create function private.is_active_coach()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.coaches c on c.profile_id = p.id
    where p.id = auth.uid()
      and p.role in ('coach', 'admin')
      and c.is_active
  );
$$;

-- ---------------------------------------------------------------------------
-- Relationship helpers
-- ---------------------------------------------------------------------------
create function private.is_guardian_of(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.parent_player_relationships r
    where r.player_id = p_player_id
      and r.parent_id = auth.uid()
  );
$$;

create function private.is_assigned_to_program(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_coach()
    and exists (
      select 1
      from public.program_coaches pc
      where pc.program_id = p_program_id
        and pc.coach_id = auth.uid()
    );
$$;

-- The signed-in coach is assigned to a program the player is enrolled in
-- (any enrollment status except withdrawn).
create function private.coaches_player(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_active_coach()
    and exists (
      select 1
      from public.enrollments e
      join public.program_coaches pc on pc.program_id = e.program_id
      where e.player_id = p_player_id
        and e.status <> 'withdrawn'
        and pc.coach_id = auth.uid()
    );
$$;

create function private.coaches_session(p_session_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.program_sessions s
    where s.id = p_session_id
      and private.is_assigned_to_program(s.program_id)
  );
$$;

-- The player is enrolled (not withdrawn) in the session's program.
create function private.session_includes_player(p_session_id uuid, p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.program_sessions s
    join public.enrollments e on e.program_id = s.program_id
    where s.id = p_session_id
      and e.player_id = p_player_id
      and e.status <> 'withdrawn'
  );
$$;

create function private.can_view_player(p_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin()
    or private.is_guardian_of(p_player_id)
    or private.coaches_player(p_player_id);
$$;

-- Programs other than drafts are visible to every signed-in user; drafts only
-- to administrators and assigned coaches.
create function private.can_view_program(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.programs p
    where p.id = p_program_id
      and (p.status <> 'draft' or private.is_admin() or private.is_assigned_to_program(p.id))
  );
$$;

-- Which other people's profiles (names) the signed-in user may see:
--   * administrators see everyone;
--   * coaches see guardians of players they coach;
--   * parents see co-guardians of their players and coaches assigned to
--     programs their players are enrolled in.
create function private.can_view_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_profile_id = auth.uid()
    or private.is_admin()
    or exists (
      select 1
      from public.parent_player_relationships r
      where r.parent_id = p_profile_id
        and (private.coaches_player(r.player_id) or private.is_guardian_of(r.player_id))
    )
    or exists (
      select 1
      from public.program_coaches pc
      join public.enrollments e on e.program_id = pc.program_id and e.status <> 'withdrawn'
      where pc.coach_id = p_profile_id
        and private.is_guardian_of(e.player_id)
    );
$$;

-- ---------------------------------------------------------------------------
-- Profile protection: only administrators change roles, and an administrator
-- cannot change their own role (prevents locking PBP out of admin access).
-- ---------------------------------------------------------------------------
create function private.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or new.role is not distinct from old.role then
    return new;
  end if;
  if not private.is_admin() then
    raise exception 'Only administrators can change account roles.' using errcode = '42501';
  end if;
  if new.id = auth.uid() then
    raise exception 'Administrators cannot change their own role.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_role
  before update on public.profiles
  for each row execute function private.protect_profile_role();

-- Coaches may edit their own bio but not their active flag.
create function private.protect_coach_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and new.is_active is distinct from old.is_active
     and not private.is_admin() then
    raise exception 'Only administrators can activate or deactivate coaches.' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger coaches_protect_status
  before update on public.coaches
  for each row execute function private.protect_coach_status();

-- ---------------------------------------------------------------------------
-- Review workflow for assessments and progress reports
--
--   draft --submit--> submitted --approve--> approved --publish--> published
--     ^                  |                     |
--     +------return------+--------return-------+
--
--   submit:   the author, or an administrator
--   return:   submitted -> draft by the author or an administrator;
--             approved -> draft by an administrator
--   approve:  a coach assigned to the player's program, or an administrator
--   publish:  an administrator
--
-- Content can change only while the record is a draft. Published records are
-- final. Workflow columns (timestamps, approver, publisher) are set here and
-- cannot be written directly.
-- ---------------------------------------------------------------------------
create function private.enforce_review_workflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  workflow_columns constant text[] := array[
    'status', 'updated_at', 'submitted_at', 'approved_by', 'approved_at', 'published_by', 'published_at'
  ];
  author uuid;
  is_author boolean;
  missing_scores integer;
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft' then
      raise exception 'New % must start as drafts.', tg_table_name using errcode = '42501';
    end if;
    new.submitted_at := null;
    new.approved_by := null;
    new.approved_at := null;
    new.published_by := null;
    new.published_at := null;
    return new;
  end if;

  author := case tg_table_name
    when 'assessments' then (to_jsonb(old) ->> 'coach_id')::uuid
    else (to_jsonb(old) ->> 'author_id')::uuid
  end;
  is_author := author = auth.uid();

  -- No status change: only drafts may be edited.
  if new.status = old.status then
    if old.status <> 'draft'
       and (to_jsonb(new) - workflow_columns) is distinct from (to_jsonb(old) - workflow_columns) then
      raise exception 'This % is % and can no longer be edited.', tg_table_name, old.status
        using errcode = '42501';
    end if;
    -- Keep workflow columns as they were.
    new.submitted_at := old.submitted_at;
    new.approved_by := old.approved_by;
    new.approved_at := old.approved_at;
    new.published_by := old.published_by;
    new.published_at := old.published_at;
    return new;
  end if;

  -- Status change: content must stay the same during the transition.
  if (to_jsonb(new) - workflow_columns) is distinct from (to_jsonb(old) - workflow_columns) then
    raise exception 'Change the status and the content in separate steps.' using errcode = '42501';
  end if;

  if old.status = 'draft' and new.status = 'submitted' then
    if not (is_author or private.is_admin()) then
      raise exception 'Only the author or an administrator can submit.' using errcode = '42501';
    end if;
    if tg_table_name = 'assessments' then
      select count(*) into missing_scores
      from public.assessment_criteria c
      where c.template_id = (to_jsonb(new) ->> 'template_id')::uuid
        and c.is_active
        and not exists (
          select 1
          from public.assessment_scores s
          where s.assessment_id = new.id
            and s.criterion_id = c.id
            and btrim(s.comment) <> ''
        );
      if missing_scores > 0 then
        raise exception 'Every criterion needs a rating and a comment before submitting (% missing).', missing_scores
          using errcode = '23514';
      end if;
    else
      if btrim(coalesce(to_jsonb(new) ->> 'coach_observations', '')) = '' then
        raise exception 'Add coach observations before submitting.' using errcode = '23514';
      end if;
    end if;
    new.submitted_at := now();

  elsif old.status = 'submitted' and new.status = 'draft' then
    if not (is_author or private.is_admin()) then
      raise exception 'Only the author or an administrator can return this to draft.' using errcode = '42501';
    end if;
    new.submitted_at := null;

  elsif old.status = 'submitted' and new.status = 'approved' then
    if not (private.is_admin() or private.coaches_player(new.player_id)) then
      raise exception 'Only a coach assigned to this player or an administrator can approve.' using errcode = '42501';
    end if;
    new.approved_by := auth.uid();
    new.approved_at := now();

  elsif old.status = 'approved' and new.status = 'published' then
    if not private.is_admin() then
      raise exception 'Only an administrator can publish.' using errcode = '42501';
    end if;
    new.published_by := auth.uid();
    new.published_at := now();

  elsif old.status = 'approved' and new.status = 'draft' then
    if not private.is_admin() then
      raise exception 'Only an administrator can return an approved record to draft.' using errcode = '42501';
    end if;
    new.submitted_at := null;
    new.approved_by := null;
    new.approved_at := null;

  else
    raise exception 'A % cannot move from % to %.', tg_table_name, old.status, new.status using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger assessments_enforce_workflow
  before insert or update on public.assessments
  for each row execute function private.enforce_review_workflow();

create trigger progress_reports_enforce_workflow
  before insert or update on public.progress_reports
  for each row execute function private.enforce_review_workflow();

-- Scores change only while their assessment is a draft, and must use a
-- criterion from the assessment's template.
create function private.enforce_score_rules()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data public.assessment_scores;
  parent public.assessments;
begin
  row_data := case when tg_op = 'DELETE' then old else new end;
  select * into parent from public.assessments where id = row_data.assessment_id;

  -- Administrators may delete finished assessments (for example when a family's
  -- data is deleted); nobody changes the scores of a finished assessment.
  if auth.uid() is not null
     and parent.status <> 'draft'
     and not (tg_op = 'DELETE' and private.is_admin()) then
    raise exception 'Scores can only change while the assessment is a draft.' using errcode = '42501';
  end if;

  if tg_op <> 'DELETE' and not exists (
    select 1 from public.assessment_criteria c
    where c.id = new.criterion_id and c.template_id = parent.template_id
  ) then
    raise exception 'That criterion is not part of this assessment''s template.' using errcode = '23514';
  end if;

  return row_data;
end;
$$;

create trigger assessment_scores_enforce_rules
  before insert or update or delete on public.assessment_scores
  for each row execute function private.enforce_score_rules();

-- A check-in must be for the same player as its Blueprint.
create function private.enforce_checkin_player()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.blueprints b where b.id = new.blueprint_id and b.player_id = new.player_id
  ) then
    raise exception 'The check-in player must match the Blueprint player.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger weekly_checkins_enforce_player
  before insert or update on public.weekly_checkins
  for each row execute function private.enforce_checkin_player();

-- ---------------------------------------------------------------------------
-- Audit triggers. Details record what changed, never names or free text.
-- ---------------------------------------------------------------------------
create function private.audit_review_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_audit_event('created', tg_table_name, new.id, new.player_id,
      jsonb_build_object('status', new.status));
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform private.log_audit_event('status_changed', tg_table_name, new.id, new.player_id,
      jsonb_build_object('from', old.status, 'to', new.status));
  elsif tg_op = 'DELETE' then
    perform private.log_audit_event('deleted', tg_table_name, old.id, old.player_id,
      jsonb_build_object('status', old.status));
  end if;
  return null;
end;
$$;

create trigger assessments_audit
  after insert or update or delete on public.assessments
  for each row execute function private.audit_review_record();

create trigger progress_reports_audit
  after insert or update or delete on public.progress_reports
  for each row execute function private.audit_review_record();

create trigger blueprints_audit
  after insert or update or delete on public.blueprints
  for each row execute function private.audit_review_record();

create trigger enrollments_audit
  after insert or update or delete on public.enrollments
  for each row execute function private.audit_review_record();

create function private.audit_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    perform private.log_audit_event('role_changed', 'profiles', new.id, null,
      jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  return null;
end;
$$;

create trigger profiles_audit_role
  after update on public.profiles
  for each row execute function private.audit_role_change();

create function private.audit_consent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.log_audit_event('consent_recorded', 'consent_records', new.id, new.player_id,
    jsonb_build_object('consent_type', new.consent_type, 'document_version', new.document_version,
      'granted', new.granted));
  return null;
end;
$$;

create trigger consent_records_audit
  after insert on public.consent_records
  for each row execute function private.audit_consent();

create function private.audit_player_deleted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.log_audit_event('deleted', 'players', old.id, old.id, '{}'::jsonb);
  return null;
end;
$$;

create trigger players_audit_delete
  after delete on public.players
  for each row execute function private.audit_player_deleted();
