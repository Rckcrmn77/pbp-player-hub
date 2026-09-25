-- Sprint 4: rules for weekly check-ins and progress reports.
--
-- Check-ins:
--   * week_start must fall between the Blueprint's first week and the current
--     week (PBP's time zone), so families cannot check in for future weeks;
--   * families edit a check-in only while its Blueprint is still active.
-- Progress reports:
--   * the linked Blueprint and assessments must belong to the report's player.

create function private.enforce_checkin_week()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  this_week date := date_trunc('week', (now() at time zone 'America/New_York')::date)::date;
  first_week date;
begin
  -- Fixtures and maintenance run without a signed-in user.
  if auth.uid() is null then
    return new;
  end if;

  select date_trunc('week', b.start_date)::date into first_week
  from public.blueprints b
  where b.id = new.blueprint_id;

  if new.week_start > this_week then
    raise exception 'Check-ins cannot be for a future week.' using errcode = '23514';
  end if;
  if first_week is not null and new.week_start < first_week then
    raise exception 'Check-ins cannot be for a week before the Blueprint started.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger weekly_checkins_enforce_week
  before insert or update on public.weekly_checkins
  for each row execute function private.enforce_checkin_week();

drop policy "check-ins: submitters edit their own" on public.weekly_checkins;

create policy "check-ins: submitters edit while the blueprint is active" on public.weekly_checkins
  for update to authenticated
  using (
    submitted_by = (select auth.uid())
    and (select private.is_guardian_of(player_id))
    and exists (
      select 1 from public.blueprints b
      where b.id = weekly_checkins.blueprint_id and b.status = 'active'
    )
  )
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

create function private.enforce_report_links()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.blueprint_id is not null and not exists (
    select 1 from public.blueprints b where b.id = new.blueprint_id and b.player_id = new.player_id
  ) then
    raise exception 'The report''s Blueprint must belong to the same player.' using errcode = '23514';
  end if;
  if exists (
    select 1 from public.assessments a
    where a.id in (new.baseline_assessment_id, new.current_assessment_id)
      and a.player_id <> new.player_id
  ) then
    raise exception 'The report''s assessments must belong to the same player.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger progress_reports_enforce_links
  before insert or update on public.progress_reports
  for each row execute function private.enforce_report_links();
