#!/usr/bin/env bash
# Prove a backup can rebuild the database: restore it into a scratch database
# on a LOCAL PostgreSQL server, compare row counts with the backup's .counts
# file, check the access rules came back, then drop the scratch database.
#
#   PGHOST=/tmp PGPORT=5432 PGUSER=postgres scripts/db/restore-check.sh backups/pbp-<timestamp>.dump
#
# Uses the standard PG* variables for a local server you can connect to as a
# superuser (for example the one from `npm run db:start`:
# PGHOST=127.0.0.1 PGPORT=54322 PGUSER=postgres PGPASSWORD=postgres).
# It refuses to run against anything that is not on this machine.
set -euo pipefail

dump="${1:?Usage: scripts/db/restore-check.sh <backup.dump>}"
counts="${dump%.dump}.counts"
[ -f "$dump" ] || { echo "No such file: $dump" >&2; exit 1; }

case "${PGHOST:-localhost}" in
  localhost | 127.0.0.1 | ::1 | /*) ;;
  *) echo "Refusing to restore to ${PGHOST}: use a local PostgreSQL server." >&2; exit 1 ;;
esac

sums="${dump%.dump}.sha256"
if [ -f "$sums" ]; then
  (cd "$(dirname "$dump")" && sha256sum --check --quiet "$(basename "$sums")")
  echo "Checksum OK"
fi

db="pbp_restore_check_$$"
psql_db=(psql -X -q -v ON_ERROR_STOP=1 -d "$db")
cleanup() { dropdb --if-exists "$db" >/dev/null 2>&1 || true; }
trap cleanup EXIT

# Policies name these roles; create them on the local server if missing.
psql -X -q -v ON_ERROR_STOP=1 -d postgres <<'SQL'
do $$
declare r text;
begin
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if not exists (select 1 from pg_roles where rolname = r) then
      execute format('create role %I nologin', r);
    end if;
  end loop;
end $$;
SQL

createdb --template=template0 "$db"
"${psql_db[@]}" -c "drop schema public cascade"
pg_restore --no-owner --no-privileges --exit-on-error -d "$db" "$dump"
echo "Restored into scratch database ${db}"

failures=0
if [ -f "$counts" ]; then
  while read -r table expected; do
    actual="$("${psql_db[@]}" -A -t -c "select count(*) from ${table}")"
    if [ "$actual" != "$expected" ]; then
      echo "MISMATCH ${table}: backup had ${expected}, restore has ${actual}"
      failures=$((failures + 1))
    fi
  done < "$counts"
  echo "Row counts compared for $(wc -l < "$counts") tables"
else
  echo "No ${counts} file: row counts not compared"
fi

without_rls="$("${psql_db[@]}" -A -t -c "select string_agg(relname, ', ') from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity")"
if [ -n "$without_rls" ]; then
  echo "Row Level Security is off on: ${without_rls}"
  failures=$((failures + 1))
fi
policies="$("${psql_db[@]}" -A -t -c "select count(*) from pg_policies where schemaname = 'public'")"
echo "Access policies restored: ${policies}"
[ "$policies" -gt 0 ] || failures=$((failures + 1))

if [ "$failures" -gt 0 ]; then
  echo "RESTORE CHECK FAILED (${failures} problem(s))"
  exit 1
fi
echo "RESTORE CHECK PASSED"
