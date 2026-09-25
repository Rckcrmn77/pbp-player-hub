# Backup and recovery

How to back up the PBP Player Hub database, prove a backup works, and recover.

## What needs backing up

| What                         | Where it lives                          | How it comes back                                             |
| ---------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| Families, players, coaching  | Supabase database (`public`)            | From a database backup                                        |
| Sign-in accounts             | Supabase database (`auth`)              | From a database backup (passwords stay hashed)                |
| Database structure and rules | `supabase/migrations` in GitHub         | Already versioned; included in every backup too               |
| App code                     | GitHub                                  | Redeploy from `main`                                          |
| Settings and secrets         | Supabase, Resend and hosting dashboards | Recorded in PBP's password manager (see the launch checklist) |

The app stores no uploaded files, so there is no file storage to back up.

## Backups

1. **Supabase's own backups.** Check what your plan includes in the Supabase dashboard (Database → Backups).
   Plans differ in whether daily backups and point-in-time recovery are included. Don't rely on the free
   tier for this; confirm in the dashboard.
2. **PBP's own backup (recommended weekly during the pilot, and before every migration).** On a computer
   with the PostgreSQL client tools installed (the `pg_dump` version must be at least the server's):

   ```bash
   # Connection string from Supabase: Project Settings → Database. It contains the
   # database password, so type or paste it into the terminal; never save it in the repository.
   export BACKUP_DATABASE_URL='postgresql://...'
   scripts/db/backup.sh            # writes backups/pbp-<timestamp>.dump, .counts and .sha256
   ```

   The `backups/` folder is ignored by git. The backup contains every family's personal data: move it to
   storage only PBP controls (for example an encrypted drive or a restricted business cloud folder), and
   delete old copies according to PBP's retention decision (see [`privacy-review.md`](./privacy-review.md)).

## Prove a backup works (restore check)

A backup that has never been restored is only a hope. After each backup (or at least monthly):

```bash
npm run db:start   # local Supabase in Docker, or any local PostgreSQL you control
PGHOST=127.0.0.1 PGPORT=54322 PGUSER=postgres PGPASSWORD=postgres \
  scripts/db/restore-check.sh backups/pbp-<timestamp>.dump
```

The check verifies the checksum and restores into a new scratch database on your computer. It then
compares every table's row count with the counts taken at backup time, confirms Row Level Security and the
access policies came back, and deletes the scratch database. It only ever restores to a local server.
Expect `RESTORE CHECK PASSED`.

This was tested in Sprint 5 against a local database with the real Supabase sign-in schema: 25 tables and
79 access policies restored with matching row counts. A deliberately wrong count was reported as a failure.

## Recovery

| Situation                                  | What to do                                                                                                                                                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A record was changed or deleted by mistake | Restore the latest backup locally (restore check without the cleanup, or `pg_restore` into a local database), look up the old values, and re-enter them in the app. The audit trail shows who changed what and when.             |
| A bad migration or a broken database       | Use Supabase's restore (Database → Backups) if your plan has it. Otherwise a developer creates a new Supabase project, loads PBP's latest backup into it, and points the app at the new project (see "Not yet rehearsed" below). |
| Supabase project lost or account locked    | Same as above with a new project; then update the site URL, email (SMTP) settings and redirect URLs as in the setup guide.                                                                                                       |
| The hosted app is down                     | Redeploy `main` from GitHub; the data is unaffected.                                                                                                                                                                             |

After any recovery: sign in as a parent, a coach and an admin to confirm each sees the right data, and tell
affected families if data was lost or exposed.

## Not yet rehearsed

Restoring into a **new hosted Supabase project** has not been practised yet, because no hosted project
exists. A new project already contains its own `auth` schema, so loading a backup into it takes more care
than the local restore check (for example, restoring the app's tables and the sign-in accounts' rows into
the structure Supabase created). Rehearse this once on a spare free project before the pilot, and record the
exact steps here.

## Schedule (suggested)

- Before every database migration: run a backup.
- Weekly during the pilot: run a backup and the restore check.
- Monthly after launch: restore check of the latest backup, noted in PBP's records.
