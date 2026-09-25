#!/usr/bin/env bash
# Back up the PBP Player Hub database to a local file.
#
#   BACKUP_DATABASE_URL='postgresql://...' scripts/db/backup.sh [output-dir]
#
# BACKUP_DATABASE_URL is the database connection string from the Supabase
# dashboard (Project Settings > Database). It contains a password: set it in
# your shell or password manager, never in a file in this repository.
#
# Writes three files to output-dir (default ./backups, which git ignores):
#   pbp-<timestamp>.dump        the backup (pg_dump custom format)
#   pbp-<timestamp>.counts      row counts per table, for scripts/db/restore-check.sh
#   pbp-<timestamp>.sha256      checksum of the dump
#
# The backup holds every family's personal data. Keep it only in storage PBP
# controls and restricts (see docs/backup-and-recovery.md).
#
# Needs pg_dump at least as new as the server's PostgreSQL version.
set -euo pipefail

: "${BACKUP_DATABASE_URL:?Set BACKUP_DATABASE_URL to the database connection string.}"
out_dir="${1:-backups}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
base="${out_dir}/pbp-${stamp}"
mkdir -p "$out_dir"
chmod 700 "$out_dir"
umask 077

# The app's tables (public), its helper functions (private), and sign-in
# accounts (auth). Supabase's own internal schemas are not needed.
pg_dump --format=custom --no-owner --no-privileges \
  --schema=public --schema=private --schema=auth \
  --file="${base}.dump" "$BACKUP_DATABASE_URL"

# Row counts, so a restore can be checked table by table.
psql -X -q -A -t -v ON_ERROR_STOP=1 "$BACKUP_DATABASE_URL" > "${base}.counts" <<'SQL'
select format('select %L || '' '' || count(*) from %I.%I;', n.nspname || '.' || c.relname, n.nspname, c.relname)
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r' and (n.nspname = 'public' or (n.nspname = 'auth' and c.relname in ('users', 'identities')))
order by 1
\gexec
SQL

(cd "$out_dir" && sha256sum "$(basename "${base}.dump")" > "$(basename "${base}.sha256")")

echo "Backup written: ${base}.dump ($(du -h "${base}.dump" | cut -f1))"
echo "Tables counted: $(wc -l < "${base}.counts")"
echo "Next: check it with scripts/db/restore-check.sh ${base}.dump"
