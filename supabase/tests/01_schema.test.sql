-- Structural guarantees that must hold for every table, including tables
-- added by future migrations.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

select is(
  (select count(*) from pg_tables where schemaname = 'public'),
  23::bigint,
  'the public schema has the 23 expected tables'
);

select is(
  (select array_agg(c.relname order by c.relname)
   from pg_class c
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity),
  null,
  'Row Level Security is enabled on every table'
);

select is(
  (select array_agg(t.tablename order by t.tablename)
   from pg_tables t
   where t.schemaname = 'public'
     and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename)),
  null,
  'every table has at least one policy'
);

select is(
  (select array_agg(distinct table_name::text order by table_name::text)
   from information_schema.role_table_grants
   where grantee = 'anon' and table_schema = 'public'),
  null,
  'signed-out visitors (anon) have no privileges on any table'
);

select is(
  (select array_agg(distinct p.polname order by p.polname)
   from pg_policy p
   where p.polrelid::regclass::text not like 'pg_%'
     and exists (select 1 from pg_class c where c.oid = p.polrelid and c.relnamespace = 'public'::regnamespace)
     and not (p.polroles = array[(select oid from pg_roles where rolname = 'authenticated')])),
  null,
  'every policy applies to the authenticated role only'
);

select is(
  (select array_agg(t.tablename order by t.tablename)
   from pg_tables t
   where t.schemaname = 'public'
     and not exists (
       select 1 from information_schema.columns c
       where c.table_schema = 'public' and c.table_name = t.tablename and c.column_name = 'created_at'
     )),
  null,
  'every table has a created_at timestamp'
);

select is(
  (select array_agg(c.table_name::text order by c.table_name::text)
   from information_schema.columns c
   where c.table_schema = 'public'
     and c.column_name = 'updated_at'
     and not exists (
       select 1 from pg_trigger tg
       join pg_proc f on f.oid = tg.tgfoid
       where tg.tgrelid = format('public.%I', c.table_name)::regclass
         and f.proname = 'set_updated_at'
     )),
  null,
  'every updated_at column is maintained by a trigger'
);

select is(
  (select array_agg(c.conrelid::regclass || '.' || a.attname order by 1)
   from pg_constraint c
   join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
   where c.contype = 'f'
     and c.connamespace = 'public'::regnamespace
     and not exists (select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1])),
  null,
  'every foreign key column is indexed'
);

select is(
  (select array_agg(p.proname order by p.proname)
   from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.prosecdef),
  null,
  'no SECURITY DEFINER functions are exposed in the public schema'
);

select is(
  (select array_agg(p.proname order by p.proname)
   from pg_proc p
   where p.pronamespace = 'private'::regnamespace
     and p.prosecdef
     and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%')),
  null,
  'every SECURITY DEFINER helper pins its search_path'
);

select ok(
  not has_schema_privilege('anon', 'private', 'usage'),
  'signed-out visitors cannot use the private helper schema'
);

select ok(
  not has_table_privilege('authenticated', 'public.audit_events', 'insert')
    and not has_table_privilege('authenticated', 'public.audit_events', 'update')
    and not has_table_privilege('authenticated', 'public.audit_events', 'delete')
    and not has_table_privilege('authenticated', 'public.consent_records', 'update')
    and not has_table_privilege('authenticated', 'public.consent_records', 'delete'),
  'audit events and consent records are append-only for signed-in users'
);

select * from finish();
rollback;
