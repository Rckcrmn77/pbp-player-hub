# PBP Player Hub

A parent-managed lacrosse player-development web app for **Project Blueprint Athlete Development**.
_Prepare. Develop. Compete._

The product scope, roles, and safety requirements are defined in [`PROJECT_CHARTER.md`](./PROJECT_CHARTER.md),
which is the source of truth for what gets built.

## Current status: Sprint 5 (pilot and launch readiness)

- **Parents**: sign-up and sign-in, dashboard, player profiles, consent, upcoming sessions, attendance,
  programs open for registration, published assessments, the current Blueprint, weekly check-ins, progress
  since the baseline, and published progress reports (printable)
- **Admins**: programs, sessions, coach assignments, rosters, roles, assessment templates and criteria,
  the drill library, and publishing approved assessments and progress reports to families
- **Coaches**: sessions, rosters, attendance, baseline and follow-up assessments (1–5 ratings with required
  comments), Blueprints with priorities and drills, weekly check-ins, missing check-ins and family questions,
  baseline-vs-current progress, and progress reports with approval
- Database with Row Level Security on every table ([`docs/database.md`](./docs/database.md))
- Accessibility checked against WCAG 2.2 AA on every page (automated in CI), strict security headers, and
  kept out of search engines during the pilot
- Launch readiness: [privacy review](./docs/privacy-review.md), [backup and recovery](./docs/backup-and-recovery.md)
  (with a tested restore check), [launch checklist](./docs/launch-checklist.md) and [pilot plan](./docs/pilot-plan.md)
- **All legal wording is placeholder text marked for review.** Nothing is deployed yet; the pilot waits on
  the owner's hosting, accounts and legal review.

## Requirements

- Node.js 22 or newer (see `.nvmrc`)
- npm (the project's package manager — use `npm ci`, not yarn/pnpm)
- Docker, for the local Supabase database (only needed for database work)

## Getting started

```bash
npm ci                     # install exact dependency versions from package-lock.json
npm run db:start           # local Supabase in Docker (database, auth, test mailbox)
cp .env.example .env.local # then fill in the values printed by `npx supabase status`
npm run dev                # http://localhost:3000
```

Emails sent by the local stack (sign-up confirmations, sign-in links, password resets) are caught by the
test mailbox at http://127.0.0.1:54324; nothing is really sent. Without Supabase configured, public pages
still work and sign-in shows a "not set up" notice.

To connect a hosted Supabase project and Resend for email, follow
[`docs/supabase-setup.md`](./docs/supabase-setup.md).

## Scripts

| Command                     | What it does                                                            |
| --------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`               | Start the development server                                            |
| `npm run build`             | Create a production build                                               |
| `npm run start`             | Serve the production build (run `build` first)                          |
| `npm run lint`              | ESLint (Next.js + TypeScript rules)                                     |
| `npm run typecheck`         | Generate Next.js route types and run `tsc --noEmit` (strict mode)       |
| `npm run format`            | Format all files with Prettier                                          |
| `npm run format:check`      | Check formatting without writing                                        |
| `npm test`                  | Unit tests (Vitest + React Testing Library)                             |
| `npm run test:watch`        | Unit tests in watch mode                                                |
| `npm run test:e2e`          | Playwright smoke tests (desktop + mobile) against a production build    |
| `npm run check`             | Format check, lint, typecheck, and unit tests — run this before pushing |
| `npm run db:start`          | Start the local Supabase stack in Docker (applies migrations and seed)  |
| `npm run db:test`           | Run the database access tests (pgTAP) against the local stack           |
| `npm run db:reset`          | Rebuild the local database from migrations and seed                     |
| `npm run db:stop`           | Stop the local Supabase stack                                           |
| `npm run db:test:no-docker` | Run the database tests on plain PostgreSQL (see `docs/database.md`)     |

### End-to-end tests

Playwright builds the app and serves it on port 3100 (override with `PORT`). Install a browser once:

```bash
npx playwright install chromium
npm run test:e2e
```

If a Chromium binary is already installed elsewhere, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium`
instead of installing one.

## Architecture

- **Next.js App Router** (`src/app`) with **TypeScript strict mode**
- **Tailwind CSS v4** — theme tokens are defined in CSS, not a `tailwind.config` file
- **Server Components by default**; forms and the mobile menu are Client Components
- **Supabase Auth + Postgres** via `@supabase/ssr`. The app uses only the public publishable key and acts as
  the signed-in user, so Row Level Security applies to every query. The secret key is not used.
- **Authorization**: `src/proxy.ts` refreshes the session and redirects signed-out visitors early; every
  protected page and Server Action also checks the user and role on the server (`src/lib/auth/session.ts`).
- **Forms**: Server Actions with Zod validation (`src/lib/validation`), shared by client and server.

```
src/
  app/                 routes (one folder per URL) plus layout, loading, error, and 404 pages
    page.tsx           landing page            /
    globals.css        Tailwind import and PBP brand color tokens
    admin/             programs, sessions, coach assignments, rosters, people (admins only)
    coach/             coach dashboard, rosters, attendance (coaches and admins)
    parent/            parent dashboard, players, consent, account (signed-in parents only)
    login/ signup/ ... sign-in, sign-up, password reset, email check pages
    auth/confirm/      landing point for links in emails
    legal/             placeholder Terms, Privacy, Parental Consent (drafts)
  components/          shared UI, forms, parent-area components
  config/              brand copy and navigation, legal document versions, player options
  lib/                 auth/session checks, Server Actions, Supabase clients, validation, consent logic
  proxy.ts             session refresh and early sign-in redirects
e2e/                   Playwright smoke tests and parent, staff, assessment, and progress journeys (need local Supabase)
supabase/
  config.toml          local Supabase settings (local development only)
  migrations/          versioned SQL migrations, applied in filename order
  tests/               pgTAP database tests (access rules and workflows)
  seed.sql             local-only seed data (placeholder assessment template)
  templates/           auth email templates
scripts/db/            running database tests without Docker
docs/database.md       schema, access rules, workflow, open decisions
docs/supabase-setup.md connecting a hosted Supabase project and Resend
docs/launch-checklist.md, docs/pilot-plan.md, docs/privacy-review.md, docs/backup-and-recovery.md
scripts/db/backup.sh, scripts/db/restore-check.sh   database backup and restore check
.github/workflows/     CI: checks, unit tests, Playwright, database tests, parent journey
```

## Branding

**The brand colors are placeholders** until final hex codes and a logo are supplied. Change them in one place:
the `@theme` block at the top of [`src/app/globals.css`](./src/app/globals.css). Components only use token
names such as `bg-navy`, `text-orange`, and `text-carolina-dark`, so no other file needs to change. The comments
in that file list the contrast ratios to keep in mind (text needs at least 4.5:1).

Brand copy (name, tagline, slogan) lives in [`src/config/site.ts`](./src/config/site.ts). The site uses the
system font stack; no external fonts are loaded.

## Environment variables

`.env.example` lists every variable name with no values. Copy it to `.env.local` for local development.
All `.env*` files except `.env.example` are ignored by git — **never commit real credentials**. Variables
prefixed `NEXT_PUBLIC_` are sent to the browser; secret keys must never use that prefix.

The app reads only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`NEXT_PUBLIC_SITE_URL`, and the optional `NEXT_PUBLIC_FEEDBACK_EMAIL` (footer feedback link) and
`NEXT_PUBLIC_ALLOW_INDEXING` (search engines; off unless `true`). The Supabase secret key is never used by
the app.

## Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request and on pushes to `main`:
format check, lint, typecheck, unit tests, the Playwright smoke tests, the database tests, and the full
parent and staff journeys (sign-up, email confirmation, players, consent, sign-in, password reset; programs,
sessions, coach assignment, rosters, attendance; assessments, approval, publishing, Blueprints; weekly
check-ins and progress reports) and accessibility checks of every page against a local Supabase stack
started in Docker on the runner.

## Contributing

Work happens on feature branches and lands on `main` through pull requests reviewed by the project manager.
A change is done when it meets the charter's definition of done (section 10), including `npm run check`
and `npm run test:e2e` passing, and `npm run db:test` for database changes.
