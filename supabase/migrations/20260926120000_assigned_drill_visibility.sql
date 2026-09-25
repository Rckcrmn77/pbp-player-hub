-- Families can always read drills that are assigned in a Blueprint they can
-- see, even after the drill is retired from the library (is_active = false).
-- The subquery runs with the caller's permissions, so the blueprint_drills and
-- blueprints policies decide which assignments count.

create policy "drills: read when assigned in a visible blueprint" on public.drills
  for select to authenticated
  using (exists (select 1 from public.blueprint_drills bd where bd.drill_id = drills.id));
