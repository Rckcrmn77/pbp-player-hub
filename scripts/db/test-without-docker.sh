#!/usr/bin/env bash
# Run the database tests on plain PostgreSQL, without Docker.
#
# The normal way is `npm run db:test` (Supabase local stack, needs Docker).
# Use this when Docker is unavailable. It needs PostgreSQL 15+ server binaries,
# pgTAP and pg_prove installed locally, and a server you can connect to as a
# superuser. It creates (and afterwards drops) a scratch database.
#
#   PGHOST=/tmp PGPORT=5432 PGUSER=postgres scripts/db/test-without-docker.sh
set -euo pipefail

cd "$(dirname "$0")/../.."
db="pbp_test_$$"
psql_cmd=(psql -X -q -v ON_ERROR_STOP=1 -d "$db")

cleanup() { dropdb --if-exists "$db" >/dev/null 2>&1 || true; }
trap cleanup EXIT

createdb "$db"
"${psql_cmd[@]}" -f scripts/db/supabase-shim.sql
"${psql_cmd[@]}" -c "create extension if not exists pgtap with schema extensions"
for migration in supabase/migrations/*.sql; do
  echo "Applying ${migration}"
  "${psql_cmd[@]}" -f "$migration"
done
echo "Applying supabase/seed.sql"
"${psql_cmd[@]}" -f supabase/seed.sql

PGOPTIONS='-c search_path="$user",public,extensions' pg_prove -d "$db" supabase/tests/*.test.sql
