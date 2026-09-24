-- Index every foreign key column that is not already the leading column of an
-- index. Keeps joins, policy checks and cascading deletes (for example when an
-- account is deleted) fast. A database test enforces this rule for future
-- migrations.

create index assessment_criteria_created_by_idx on public.assessment_criteria (created_by);
create index assessment_templates_created_by_idx on public.assessment_templates (created_by);
create index assessments_approved_by_idx on public.assessments (approved_by);
create index assessments_published_by_idx on public.assessments (published_by);
create index assessments_template_id_idx on public.assessments (template_id);
create index attendance_recorded_by_idx on public.attendance (recorded_by);
create index audit_events_actor_id_idx on public.audit_events (actor_id);
create index blueprints_baseline_assessment_id_idx on public.blueprints (baseline_assessment_id);
create index blueprints_coach_id_idx on public.blueprints (coach_id);
create index coach_notes_program_id_idx on public.coach_notes (program_id);
create index coach_notes_session_id_idx on public.coach_notes (session_id);
create index coaches_created_by_idx on public.coaches (created_by);
create index drills_created_by_idx on public.drills (created_by);
create index enrollments_created_by_idx on public.enrollments (created_by);
create index parent_player_relationships_created_by_idx on public.parent_player_relationships (created_by);
create index program_coaches_created_by_idx on public.program_coaches (created_by);
create index program_sessions_created_by_idx on public.program_sessions (created_by);
create index programs_created_by_idx on public.programs (created_by);
create index progress_reports_approved_by_idx on public.progress_reports (approved_by);
create index progress_reports_author_id_idx on public.progress_reports (author_id);
create index progress_reports_baseline_assessment_id_idx on public.progress_reports (baseline_assessment_id);
create index progress_reports_blueprint_id_idx on public.progress_reports (blueprint_id);
create index progress_reports_current_assessment_id_idx on public.progress_reports (current_assessment_id);
create index progress_reports_published_by_idx on public.progress_reports (published_by);
create index progress_reports_recommended_program_id_idx on public.progress_reports (recommended_program_id);
create index weekly_checkins_submitted_by_idx on public.weekly_checkins (submitted_by);
