# Connecting a hosted Supabase project and Resend

This is the one-time setup that connects the Player Hub to a real (free) Supabase project and sends auth
emails through Resend. Local development and CI do not need any of this: they use the local Supabase stack
(`npm run db:start`) and its test mailbox.

**Cost guard:** use a Supabase organization on the **Free** plan and the Resend **Free** plan. Nothing below
requires a paid plan. Do not create the project in an organization that is on a paid plan, because each
project there is billed.

## 1. Create the Supabase project (owner)

1. Sign in at supabase.com and open (or create) an organization on the **Free** plan.
2. **New project** → name `pbp-player-hub-dev`, region **East US**, and a strong database password (store it
   in a password manager; it is not needed in the app).
3. When it is ready, open **Project Settings → API keys** and note:
   - the **Project URL** (`https://<project-ref>.supabase.co`)
   - the **publishable** key (`sb_publishable_…`). This key is public by design.
   - Do not copy the secret / service-role key anywhere. The app does not use it.

## 2. Let the build environment use it (owner)

In the Claude Code cloud environment settings (environment menu in the session title bar → **Edit**):

- **Environment variables** (values are safe to expose, but still set them here rather than in chat):
  - `NEXT_PUBLIC_SUPABASE_URL` = the Project URL
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = the publishable key
  - `NEXT_PUBLIC_SITE_URL` = `http://localhost:3000` for now
- **API credential** (only if you want Claude to apply the migrations and auth settings for you):
  `SUPABASE_ACCESS_TOKEN` = a Supabase personal access token (Account → Access Tokens). This token can manage
  every project in your account, including creating billable ones, so revoke it when setup is done. Claude
  will not create projects or change plans.
- **Network access**, add these allowed domains:
  - `<project-ref>.supabase.co` and `api.supabase.com`
  - Optional, to run the full local Supabase stack in the cloud environment: `registry-1.docker.io`,
    `auth.docker.io`, `production.cloudflare.docker.com`, `public.ecr.aws`, `ghcr.io`,
    `pkg-containers.githubusercontent.com`

Start a **new session** afterwards; settings are read when a session starts.

## 3. Apply the database migrations

With `SUPABASE_ACCESS_TOKEN` set, Claude applies `supabase/migrations/*.sql` in order through the Supabase
Management API and confirms the result. Without it, paste each migration file in order into the dashboard's
**SQL Editor** and run it. Do not run `supabase/seed.sql` on a hosted project; it is for local development.

## 4. Auth settings (dashboard: Authentication)

| Setting                                  | Value                                                    |
| ---------------------------------------- | -------------------------------------------------------- |
| Sign In / Providers → Email              | Enabled; **Confirm email** on                            |
| Sign In / Providers → Email → min length | 10 characters                                            |
| URL Configuration → Site URL             | `http://localhost:3000` (change when the app is hosted)  |
| URL Configuration → Redirect URLs        | `http://localhost:3000/**`                               |
| Emails → Templates                       | Paste the three files from `supabase/templates/` (below) |

Email templates (subject → file):

- **Confirm signup**: "Confirm your PBP Player Hub account" → `supabase/templates/confirmation.html`
- **Magic Link**: "Your PBP Player Hub sign-in link" → `supabase/templates/magic_link.html`
- **Reset Password**: "Reset your PBP Player Hub password" → `supabase/templates/recovery.html`

These templates send people to `/auth/confirm`, which works even if the email is opened on a different
device from the one that asked for it.

## 5. Send auth emails through Resend (owner)

Supabase's built-in email is limited to a few messages per hour and only reaches team members, so real sign-ups
need custom SMTP.

1. Create a free account at resend.com and an **API key** with "Sending access".
2. Until a domain is verified, Resend's free plan only delivers to the email address that owns the Resend
   account. That is enough for testing. To email real families, verify a domain you own (for example
   `mail.<your-domain>`) by adding the DNS records Resend shows.
3. In Supabase: **Authentication → Emails → SMTP Settings** → enable custom SMTP:
   - Host `smtp.resend.com`, port `465`, username `resend`, password = the Resend API key
   - Sender email: `onboarding@resend.dev` for testing, or an address on your verified domain
   - Sender name: `PBP Player Hub`
4. Paste the API key only into that Supabase form. It does not go in the app, in `.env` files, or in chat.

## What is still open

- **Hosting a preview.** The app runs locally against the dev project. A shareable, private hosted preview
  needs a hosting decision (see the Sprint 1 pull request).
- **Legal wording.** All Terms, Privacy and Parental Consent text is placeholder and flagged in the app.
