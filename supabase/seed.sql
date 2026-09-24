-- Local development seed data. Applied by `supabase db reset` on a local
-- database only; it is never pushed to a hosted project.
--
-- Contains reference data only: no players, parents or coaches.
-- The template below is a PLACEHOLDER built from the charter's five initial
-- categories. PBP will supply the final criteria and wording.

insert into public.assessment_templates (id, name, description, version, is_active)
values (
  '00000000-0000-4000-8000-000000000001',
  'PBP core assessment (placeholder)',
  'Placeholder template using the five initial charter categories. Replace with PBP''s final criteria.',
  1,
  true
)
on conflict (id) do nothing;

insert into public.assessment_criteria (template_id, category, name, description, sort_order)
values
  ('00000000-0000-4000-8000-000000000001', 'Stick skills', 'Stick skills',
   'Placeholder: catching, throwing and cradling under pressure.', 1),
  ('00000000-0000-4000-8000-000000000001', 'Footwork and athletic movement', 'Footwork and athletic movement',
   'Placeholder: balance, change of direction and body position.', 2),
  ('00000000-0000-4000-8000-000000000001', 'Position fundamentals', 'Position fundamentals',
   'Placeholder: core techniques for the player''s primary position.', 3),
  ('00000000-0000-4000-8000-000000000001', 'Lacrosse IQ and decision-making', 'Lacrosse IQ and decision-making',
   'Placeholder: reading the field and making good choices.', 4),
  ('00000000-0000-4000-8000-000000000001', 'Communication, confidence, and effort', 'Communication, confidence, and effort',
   'Placeholder: talking on the field, composure and work rate.', 5)
on conflict do nothing;
