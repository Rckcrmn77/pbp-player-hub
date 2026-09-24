# PBP Player Hub

A parent-managed lacrosse player-development web app for **Project Blueprint Athlete Development**.
_Prepare. Develop. Compete._

The product scope, roles, and safety requirements are defined in [`PROJECT_CHARTER.md`](./PROJECT_CHARTER.md),
which is the source of truth for what gets built.

## Current status: Sprint 0 (foundation)

- Responsive, mobile-first app shell with PBP branding (placeholder colors)
- Placeholder routes: `/`, `/login`, `/parent`, `/coach`, `/admin`
- Database design as Supabase migrations with Row Level Security on every table, plus database tests. See
  [`docs/database.md`](./docs/database.md).
- **No sign-in or real data yet, and the app does not talk to the database.** The parent, coach, and admin
  pages are clearly labelled previews and do not grant or imply access. Sign-in arrives in Sprint 1.

## Requirements

- Node.js 22 or newer (see `.nvmrc`)
- npm (the project's package manager — use `npm ci`, not yarn/pnpm)
- Docker, for the local Supabase database (only needed for database work)

## Getting started

```bash
npm ci                     # install exact dependency versions from package-lock.json
cp .env.example .env.local # optional for now: no variables are used yet
npm run dev                # http://localhost:3000
```

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
- **Server Components by default**; only interactive pieces (the mobile menu) are Client Components
- **Supabase Postgres** with Row Level Security; schema changes are versioned SQL migrations in
  `supabase/migrations`. Supabase Auth and Vercel deployment are planned but not connected yet.

```
src/
  app/                 routes (one folder per URL) plus layout, loading, error, and 404 pages
    page.tsx           landing page            /
    login/             sign-in placeholder     /login
    parent/ coach/ admin/  role dashboard previews
    globals.css        Tailwind import and PBP brand color tokens
  components/          shared UI: header/navigation, footer, notice, dashboard preview
  config/site.ts       brand copy, role destinations, navigation helpers
e2e/                   Playwright smoke tests
supabase/
  config.toml          local Supabase settings (local development only)
  migrations/          versioned SQL migrations, applied in filename order
  tests/               pgTAP database tests (access rules and workflows)
  seed.sql             local-only seed data (placeholder assessment template)
scripts/db/            running database tests without Docker
docs/database.md       schema, access rules, workflow, open decisions
.github/workflows/     CI: format, lint, typecheck, unit tests, Playwright, database tests
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

Nothing reads these variables yet, and the app is not connected to a hosted Supabase project, Vercel, or any
other external service. The local Supabase stack (`npm run db:start`) prints its own local-only keys; they
are not needed until Sprint 1.

## Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) runs on every pull request and on pushes to `main`:
format check, lint, typecheck, unit tests, the Playwright smoke tests, and the database tests (a local
Supabase database started in Docker on the runner).

## Contributing

Work happens on feature branches and lands on `main` through pull requests reviewed by the project manager.
A change is done when it meets the charter's definition of done (section 10), including `npm run check`
and `npm run test:e2e` passing, and `npm run db:test` for database changes.
