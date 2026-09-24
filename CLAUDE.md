@AGENTS.md

# PBP Player Hub

- `PROJECT_CHARTER.md` is the source of truth for scope. Implement only the assigned milestone.
- Brand colors: `@theme` block in `src/app/globals.css` (placeholders). Brand copy and routes: `src/config/site.ts`.
- Before pushing: `npm run check` and `npm run test:e2e`; for database changes also `npm run db:test`.
- Database: migrations in `supabase/migrations` (never edit one that has been merged; add a new one). Access rules are documented in `docs/database.md` — keep it in sync.
