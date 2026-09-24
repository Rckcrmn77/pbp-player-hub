-- Row Level Security for every table. See docs/database.md for the access
-- matrix these policies implement.
--
-- Rules of thumb:
--   * `anon` (signed-out visitors) has no table privileges at all.
--   * Policies target `authenticated` only. With RLS enabled, anything not
--     allowed by a policy is denied.
--   * Helper calls are wrapped in `(select ...)` so Postgres evaluates them
--     once per statement instead of once per row where possible.

-- ---------------------------------------------------------------------------
-- Enable RLS and remove signed-out access everywhere
-- ---------------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('revoke all on table public.%I from anon', t.tablename);
  end loop;
end;
$$;

revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- Append-only tables: no updates or deletes through the API for anyone.
revoke insert, update, delete, truncate on public.audit_events from authenticated;
revoke update, delete, truncate on public.consent_records from authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy "profiles: read own and related" on public.profiles
  for select to authenticated
  using ((select private.can_view_profile(id)));

create policy "profiles: update own, or any as admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));

-- Inserted by the sign-up trigger; deleted with the account (service role).

-- ---------------------------------------------------------------------------
-- coaches
-- ---------------------------------------------------------------------------
create policy "coaches: signed-in users read" on public.coaches
  for select to authenticated
  using (true);

create policy "coaches: admin creates" on public.coaches
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "coaches: own bio, or any as admin" on public.coaches
  for update to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()))
  with check (profile_id = (select auth.uid()) or (select private.is_admin()));

create policy "coaches: admin deletes" on public.coaches
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- players
-- ---------------------------------------------------------------------------
create policy "players: guardians, their coaches, admins read" on public.players
  for select to authenticated
  using ((select private.can_view_player(id)));

create policy "players: parents and admins create" on public.players
  for insert to authenticated
  with check (
    (select private.is_admin())
    or (created_by = (select auth.uid()) and (select private.current_app_role()) = 'parent')
  );

create policy "players: guardians and admins update" on public.players
  for update to authenticated
  using ((select private.is_guardian_of(id)) or (select private.is_admin()))
  with check ((select private.is_guardian_of(id)) or (select private.is_admin()));

create policy "players: admin deletes" on public.players
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- parent_player_relationships
-- ---------------------------------------------------------------------------
create policy "relationships: own, co-guardians, coaches, admins read" on public.parent_player_relationships
  for select to authenticated
  using (
    parent_id = (select auth.uid())
    or (select private.is_guardian_of(player_id))
    or (select private.coaches_player(player_id))
    or (select private.is_admin())
  );

create policy "relationships: admin creates" on public.parent_player_relationships
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "relationships: admin updates" on public.parent_player_relationships
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "relationships: admin deletes" on public.parent_player_relationships
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- consent_records (append-only)
-- ---------------------------------------------------------------------------
create policy "consent: own and admins read" on public.consent_records
  for select to authenticated
  using (parent_id = (select auth.uid()) or (select private.is_admin()));

create policy "consent: parents record their own" on public.consent_records
  for insert to authenticated
  with check (
    parent_id = (select auth.uid())
    and (player_id is null or (select private.is_guardian_of(player_id)))
  );

-- ---------------------------------------------------------------------------
-- programs, program_coaches, program_sessions
-- ---------------------------------------------------------------------------
create policy "programs: non-drafts to all signed-in users" on public.programs
  for select to authenticated
  using ((select private.can_view_program(id)));

create policy "programs: admin creates" on public.programs
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "programs: admin updates" on public.programs
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "programs: admin deletes" on public.programs
  for delete to authenticated
  using ((select private.is_admin()));

create policy "program coaches: read with the program" on public.program_coaches
  for select to authenticated
  using (coach_id = (select auth.uid()) or (select private.can_view_program(program_id)));

create policy "program coaches: admin creates" on public.program_coaches
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "program coaches: admin updates" on public.program_coaches
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "program coaches: admin deletes" on public.program_coaches
  for delete to authenticated
  using ((select private.is_admin()));

create policy "sessions: read with the program" on public.program_sessions
  for select to authenticated
  using ((select private.can_view_program(program_id)));

create policy "sessions: admin creates" on public.program_sessions
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "sessions: assigned coaches and admins update" on public.program_sessions
  for update to authenticated
  using ((select private.is_admin()) or (select private.is_assigned_to_program(program_id)))
  with check ((select private.is_admin()) or (select private.is_assigned_to_program(program_id)));

create policy "sessions: admin deletes" on public.program_sessions
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- enrollments
-- ---------------------------------------------------------------------------
create policy "enrollments: guardians, assigned coaches, admins read" on public.enrollments
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.is_guardian_of(player_id))
    or (select private.is_assigned_to_program(program_id))
  );

create policy "enrollments: admin creates" on public.enrollments
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "enrollments: admin updates" on public.enrollments
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "enrollments: admin deletes" on public.enrollments
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- attendance
-- ---------------------------------------------------------------------------
create policy "attendance: guardians, assigned coaches, admins read" on public.attendance
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.is_guardian_of(player_id))
    or (select private.coaches_session(session_id))
  );

create policy "attendance: assigned coaches and admins record" on public.attendance
  for insert to authenticated
  with check (
    (select private.is_admin())
    or (
      (select private.coaches_session(session_id))
      and (select private.session_includes_player(session_id, player_id))
      and recorded_by = (select auth.uid())
    )
  );

create policy "attendance: assigned coaches and admins update" on public.attendance
  for update to authenticated
  using ((select private.is_admin()) or (select private.coaches_session(session_id)))
  with check (
    (select private.is_admin())
    or (
      (select private.coaches_session(session_id))
      and (select private.session_includes_player(session_id, player_id))
    )
  );

create policy "attendance: assigned coaches and admins delete" on public.attendance
  for delete to authenticated
  using ((select private.is_admin()) or (select private.coaches_session(session_id)));

-- ---------------------------------------------------------------------------
-- assessment_templates, assessment_criteria (reference data)
-- ---------------------------------------------------------------------------
create policy "templates: signed-in users read" on public.assessment_templates
  for select to authenticated
  using (true);

create policy "templates: admin creates" on public.assessment_templates
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "templates: admin updates" on public.assessment_templates
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "templates: admin deletes" on public.assessment_templates
  for delete to authenticated
  using ((select private.is_admin()));

create policy "criteria: signed-in users read" on public.assessment_criteria
  for select to authenticated
  using (true);

create policy "criteria: admin creates" on public.assessment_criteria
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "criteria: admin updates" on public.assessment_criteria
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "criteria: admin deletes" on public.assessment_criteria
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- assessments (workflow rules are enforced by trigger)
-- ---------------------------------------------------------------------------
create policy "assessments: staff read; guardians read published" on public.assessments
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.coaches_player(player_id))
    or (status = 'published' and (select private.is_guardian_of(player_id)))
  );

create policy "assessments: assigned coaches and admins create" on public.assessments
  for insert to authenticated
  with check (
    (select private.is_admin())
    or ((select private.coaches_player(player_id)) and coach_id = (select auth.uid()))
  );

create policy "assessments: assigned coaches and admins update" on public.assessments
  for update to authenticated
  using ((select private.is_admin()) or (select private.coaches_player(player_id)))
  with check ((select private.is_admin()) or (select private.coaches_player(player_id)));

create policy "assessments: authors delete drafts; admins delete" on public.assessments
  for delete to authenticated
  using (
    (select private.is_admin())
    or (status = 'draft' and coach_id = (select auth.uid()))
  );

-- Scores follow their assessment. The subqueries run with the caller's own
-- permissions, so the assessment policies above apply.
create policy "scores: read with the assessment" on public.assessment_scores
  for select to authenticated
  using (exists (select 1 from public.assessments a where a.id = assessment_scores.assessment_id));

create policy "scores: author or admin writes drafts" on public.assessment_scores
  for insert to authenticated
  with check (exists (
    select 1 from public.assessments a
    where a.id = assessment_scores.assessment_id
      and a.status = 'draft'
      and (a.coach_id = (select auth.uid()) or (select private.is_admin()))
  ));

create policy "scores: author or admin updates drafts" on public.assessment_scores
  for update to authenticated
  using (exists (
    select 1 from public.assessments a
    where a.id = assessment_scores.assessment_id
      and a.status = 'draft'
      and (a.coach_id = (select auth.uid()) or (select private.is_admin()))
  ))
  with check (exists (
    select 1 from public.assessments a
    where a.id = assessment_scores.assessment_id
      and a.status = 'draft'
      and (a.coach_id = (select auth.uid()) or (select private.is_admin()))
  ));

create policy "scores: author or admin deletes drafts" on public.assessment_scores
  for delete to authenticated
  using (exists (
    select 1 from public.assessments a
    where a.id = assessment_scores.assessment_id
      and (
        (a.status = 'draft' and a.coach_id = (select auth.uid()))
        or (select private.is_admin())
      )
  ));

-- ---------------------------------------------------------------------------
-- drills (reference data)
-- ---------------------------------------------------------------------------
create policy "drills: signed-in users read active; staff read all" on public.drills
  for select to authenticated
  using (is_active or (select private.is_active_coach()) or (select private.is_admin()));

create policy "drills: admin creates" on public.drills
  for insert to authenticated
  with check ((select private.is_admin()));

create policy "drills: admin updates" on public.drills
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "drills: admin deletes" on public.drills
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- blueprints and their priorities and drills
-- ---------------------------------------------------------------------------
create policy "blueprints: staff read; guardians read non-drafts" on public.blueprints
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.coaches_player(player_id))
    or (status <> 'draft' and (select private.is_guardian_of(player_id)))
  );

create policy "blueprints: assigned coaches and admins create" on public.blueprints
  for insert to authenticated
  with check (
    (select private.is_admin())
    or ((select private.coaches_player(player_id)) and coach_id = (select auth.uid()))
  );

create policy "blueprints: assigned coaches and admins update" on public.blueprints
  for update to authenticated
  using ((select private.is_admin()) or (select private.coaches_player(player_id)))
  with check ((select private.is_admin()) or (select private.coaches_player(player_id)));

create policy "blueprints: authors delete drafts; admins delete" on public.blueprints
  for delete to authenticated
  using (
    (select private.is_admin())
    or (status = 'draft' and coach_id = (select auth.uid()))
  );

create policy "priorities: read with the blueprint" on public.blueprint_priorities
  for select to authenticated
  using (exists (select 1 from public.blueprints b where b.id = blueprint_priorities.blueprint_id));

create policy "priorities: assigned coaches and admins write" on public.blueprint_priorities
  for all to authenticated
  using (exists (
    select 1 from public.blueprints b
    where b.id = blueprint_priorities.blueprint_id
      and ((select private.is_admin()) or (select private.coaches_player(b.player_id)))
  ))
  with check (exists (
    select 1 from public.blueprints b
    where b.id = blueprint_priorities.blueprint_id
      and ((select private.is_admin()) or (select private.coaches_player(b.player_id)))
  ));

create policy "blueprint drills: read with the blueprint" on public.blueprint_drills
  for select to authenticated
  using (exists (select 1 from public.blueprints b where b.id = blueprint_drills.blueprint_id));

create policy "blueprint drills: assigned coaches and admins write" on public.blueprint_drills
  for all to authenticated
  using (exists (
    select 1 from public.blueprints b
    where b.id = blueprint_drills.blueprint_id
      and ((select private.is_admin()) or (select private.coaches_player(b.player_id)))
  ))
  with check (exists (
    select 1 from public.blueprints b
    where b.id = blueprint_drills.blueprint_id
      and ((select private.is_admin()) or (select private.coaches_player(b.player_id)))
  ));

-- ---------------------------------------------------------------------------
-- weekly_checkins
-- ---------------------------------------------------------------------------
create policy "check-ins: guardians, their coaches, admins read" on public.weekly_checkins
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.is_guardian_of(player_id))
    or (select private.coaches_player(player_id))
  );

create policy "check-ins: guardians submit for an active blueprint" on public.weekly_checkins
  for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and (select private.is_guardian_of(player_id))
    and exists (
      select 1 from public.blueprints b
      where b.id = weekly_checkins.blueprint_id
        and b.player_id = weekly_checkins.player_id
        and b.status = 'active'
    )
  );

create policy "check-ins: submitters edit their own" on public.weekly_checkins
  for update to authenticated
  using (submitted_by = (select auth.uid()) and (select private.is_guardian_of(player_id)))
  with check (submitted_by = (select auth.uid()) and (select private.is_guardian_of(player_id)));

create policy "check-ins: admin deletes" on public.weekly_checkins
  for delete to authenticated
  using ((select private.is_admin()));

-- ---------------------------------------------------------------------------
-- coach_notes
-- ---------------------------------------------------------------------------
create policy "notes: staff read; guardians read parent-visible" on public.coach_notes
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.coaches_player(player_id))
    or (visibility = 'parent_visible' and (select private.is_guardian_of(player_id)))
  );

create policy "notes: assigned coaches and admins write" on public.coach_notes
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and ((select private.is_admin()) or (select private.coaches_player(player_id)))
  );

create policy "notes: authors and admins update" on public.coach_notes
  for update to authenticated
  using (author_id = (select auth.uid()) or (select private.is_admin()))
  with check (author_id = (select auth.uid()) or (select private.is_admin()));

create policy "notes: authors and admins delete" on public.coach_notes
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select private.is_admin()));

-- ---------------------------------------------------------------------------
-- progress_reports (workflow rules are enforced by trigger)
-- ---------------------------------------------------------------------------
create policy "reports: staff read; guardians read published" on public.progress_reports
  for select to authenticated
  using (
    (select private.is_admin())
    or (select private.coaches_player(player_id))
    or (status = 'published' and (select private.is_guardian_of(player_id)))
  );

create policy "reports: assigned coaches and admins create" on public.progress_reports
  for insert to authenticated
  with check (
    (select private.is_admin())
    or ((select private.coaches_player(player_id)) and author_id = (select auth.uid()))
  );

create policy "reports: assigned coaches and admins update" on public.progress_reports
  for update to authenticated
  using ((select private.is_admin()) or (select private.coaches_player(player_id)))
  with check ((select private.is_admin()) or (select private.coaches_player(player_id)));

create policy "reports: authors delete drafts; admins delete" on public.progress_reports
  for delete to authenticated
  using (
    (select private.is_admin())
    or (status = 'draft' and author_id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- audit_events (read-only, administrators)
-- ---------------------------------------------------------------------------
create policy "audit: admins read" on public.audit_events
  for select to authenticated
  using ((select private.is_admin()));
