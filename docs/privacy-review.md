# Privacy and security review (Sprint 5)

A developer's review of how the PBP Player Hub handles personal information, written before the pilot. It
is **not legal advice**. The placeholder Terms, Privacy Policy and Parental Consent pages must be reviewed by
a qualified lawyer before real families use the app, and this document is meant to help that review.

Reviewed: the `main` branch after Sprint 4, plus the Sprint 5 changes on this branch.

## Summary

- The app collects only what PBP needs to coach a player. It stores a player's **birth year**, not their
  full date of birth. Players do not have accounts; a parent or guardian enters and manages everything.
- Access is enforced by the database (Row Level Security on every table), not only by the pages. Each
  family sees only its own players. Coaches see only players on their program rosters. Assessments and
  reports reach families only after coach approval and admin publication.
- There are no analytics, advertising, tracking pixels, third-party scripts or third-party fonts. The only
  cookies are the sign-in session cookies.
- Sprint 5 adds a strict Content-Security-Policy, other security headers, and keeps the site out of search
  engines during the pilot.
- **Before launch, the owner needs to decide:** how families ask for their data to be deleted, what
  happens when consent is withdrawn, how long data is kept, and the legal wording (see "Decisions needed").

## What personal information is stored

| Data                       | Where (table)                          | About whom         | Who can see it                                                                   |
| -------------------------- | -------------------------------------- | ------------------ | -------------------------------------------------------------------------------- |
| Name, phone (optional)     | `profiles`                             | Parents, staff     | The person; admins; coaches see guardians of players they coach                  |
| Sign-in email              | `auth.users`, copy in `profile_emails` | Everyone           | The person and admins only (coaches never see parents' emails)                   |
| Password                   | `auth.users` (hashed by Supabase Auth) | Everyone           | No one (not readable, even by admins)                                            |
| Player profile             | `players`                              | Minors             | Their guardians; coaches of their programs; admins                               |
| Emergency contact          | `players`                              | Third party        | Same as the player profile (coaches need it at sessions)                         |
| Goals, strengths, notes    | `players`, `blueprints`, `coach_notes` | Minors             | Guardians (staff-only notes excepted); coaches of their programs; admins         |
| Ratings and coach comments | `assessments`, `assessment_scores`     | Minors             | Coaches of their programs; admins; guardians once **published**                  |
| Weekly check-ins           | `weekly_checkins`                      | Minors             | Their guardians; coaches of their programs; admins                               |
| Progress reports           | `progress_reports`                     | Minors             | Coaches of their programs; admins; guardians once **published**                  |
| Attendance                 | `attendance`                           | Minors             | Guardians; coaches of the session's program; admins                              |
| Consent history            | `consent_records`                      | Parents (for kids) | The parent and admins. Append-only: records are never edited or deleted by users |
| Audit trail                | `audit_events`                         | Everyone (by id)   | Admins only. Stores ids and status changes, never names or free text             |

The full access matrix is in [`database.md`](./database.md). It is covered by the database tests in
`supabase/tests`.

## Who processes the data (third parties)

| Service          | What it receives                                         | Notes                                                             |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| Supabase         | Everything above (database and sign-in)                  | Choose a US region when creating the project. Free tier to start. |
| Resend           | Email addresses and the text of sign-in and reset emails | No player information is ever emailed.                            |
| Hosting (Vercel) | Web requests, IP addresses in logs                       | The app does not log personal data. Hobby plan is non-commercial. |

The app never uses the Supabase secret (service role) key, which bypasses the access rules. The browser
never talks to Supabase directly; every read and write goes through the server as the signed-in user.

## Checks made in this review

| Area                      | Result                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Access rules              | Row Level Security on every table; 95 database tests. The UI hides nothing the database would allow.           |
| Server-side authorization | Every page and action checks the role on the server (`requireRole`); the proxy redirect is a convenience only. |
| Minimal data              | Birth year instead of date of birth; no address, school ID, photos or medical fields.                          |
| Third-party code in pages | None. Enforced by the new Content-Security-Policy (only this site's scripts, with a per-request nonce).        |
| Clickjacking              | Blocked (`frame-ancestors 'none'`, `X-Frame-Options: DENY`).                                                   |
| Other headers             | `nosniff`, strict referrer policy, camera/microphone/location disabled, HSTS on https.                         |
| Search engines            | `noindex` on every page and `robots.txt` disallows all until `NEXT_PUBLIC_ALLOW_INDEXING=true`.                |
| Secrets                   | None in the repository. Only the public Supabase URL and publishable key are used.                             |
| Logging                   | The app writes no personal data to logs.                                                                       |
| Email content             | Sign-in, confirmation and reset emails contain links only, no player data.                                     |
| Published records         | Assessments and reports cannot change after publication; approvals and publication are audited.                |

## Findings and recommendations

| #   | Finding                                                                                                                        | Risk                | Recommendation                                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | No self-service way for a family to request deletion or a copy of their data. Admins can delete a player in the database only. | Medium              | Decide the process (email PBP, or a request button). A small admin "delete player" screen can follow.                                    |
| 2   | Withdrawing parental consent is recorded, but the player's data stays visible to staff.                                        | Medium              | Decide what withdrawal means (pause coaching visibility, or delete). The app can enforce either.                                         |
| 3   | No retention period: data is kept until someone deletes it.                                                                    | Low                 | Set a period (for example, delete inactive players two years after their last program) and add it to the policy.                         |
| 4   | Free-text fields (goals, reflections, notes) could receive health or injury details.                                           | Low                 | Tell coaches and parents not to record medical information. Add a hint to the forms if PBP agrees.                                       |
| 5   | The sign-in cookies can be read by page scripts (the library's default).                                                       | Low                 | Mitigated by the strict script policy (no injected scripts can run). Revisit if a browser-side client is added.                          |
| 6   | Legal pages are placeholders, clearly marked as drafts.                                                                        | High until reviewed | Lawyer review of Terms, Privacy Policy and Parental Consent, including children's-privacy requirements, before any real family signs up. |
| 7   | Backups contain all personal data.                                                                                             | Medium              | Store backup files only in PBP-controlled, access-restricted storage; see [`backup-and-recovery.md`](./backup-and-recovery.md).          |
| 8   | Admin accounts can see everything.                                                                                             | Medium              | Keep admins to one or two people, use strong unique passwords, and review the admin list each season.                                    |

## Decisions needed from the owner

1. How families request deletion or a copy of their data, and who at PBP handles it (finding 1).
2. What happens when parental consent is withdrawn (finding 2).
3. How long player data is kept after a family stops attending (finding 3).
4. Final legal wording from a lawyer (finding 6).
5. Who holds admin access and where backups are kept (findings 7 and 8).
