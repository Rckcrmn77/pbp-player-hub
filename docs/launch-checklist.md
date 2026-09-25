# Pilot and launch checklist

Everything needed to take the Player Hub from this repository to a small pilot, and then to launch. Items
marked **(owner)** need Rick's accounts, money or decisions; Claude can do or check the rest once the
accounts exist. Nothing here has been done yet: no hosted service is connected.

## 1. Decisions before the pilot (owner)

- [ ] **Hosting.** Vercel's free Hobby plan is for non-commercial use only, and PBP is a business. Choose
      Vercel Pro (paid, per seat) or another host that allows commercial use on its free tier. Approve any
      cost first.
- [ ] **Domain.** For example `hub.<pbp-domain>`. Needed for the site address and for sending email from
      PBP's domain.
- [ ] **Legal wording.** A lawyer reviews and replaces the placeholder Terms, Privacy Policy and Parental
      Consent (`src/config/legal.ts`). This includes children's-privacy requirements. Remove the draft
      banners, then bump the document versions so families re-accept.
- [ ] **Privacy decisions** in [`privacy-review.md`](./privacy-review.md): deletion requests, consent
      withdrawal, retention, admin access, backup storage.
- [ ] **Real content.** PBP's assessment criteria (replacing the starter template), drill library, and the
      report wording.
- [ ] **Pilot group.** 3–5 families, 1–2 coaches and one admin who agree to try it (see
      [`pilot-plan.md`](./pilot-plan.md)).

## 2. Services (owner creates, Claude configures)

Follow [`supabase-setup.md`](./supabase-setup.md) for steps 1–4.

- [ ] Supabase project on the **Free** plan, US East region, strong database password in PBP's password
      manager.
- [ ] All migrations applied in order; `supabase/seed.sql` is **not** run on the hosted project.
- [ ] Supabase Auth → URL configuration: site URL = the pilot address; redirect URL
      `https://<pilot-address>/auth/confirm`.
- [ ] Email templates from `supabase/templates` copied into Supabase Auth.
- [ ] Resend (free): verify PBP's sending domain, create an API key, and enter it as Supabase Auth's custom
      SMTP server. Send a test sign-up to confirm delivery.
- [ ] First admin created with the SQL in the setup guide; coaches promoted in **Admin → People**.

## 3. Hosting (owner approves, Claude can prepare)

- [ ] Connect the GitHub repository; deploy `main` only.
- [ ] Environment variables (build time):

  | Variable                               | Pilot value                               |
  | -------------------------------------- | ----------------------------------------- |
  | `NEXT_PUBLIC_SUPABASE_URL`             | Supabase Project URL                      |
  | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key                  |
  | `NEXT_PUBLIC_SITE_URL`                 | `https://<pilot-address>`                 |
  | `NEXT_PUBLIC_FEEDBACK_EMAIL`           | the address PBP reads pilot feedback from |
  | `NEXT_PUBLIC_ALLOW_INDEXING`           | leave unset (keeps search engines out)    |

- [ ] **Never** add the Supabase secret / service-role key or the database password to the host.
- [ ] Custom domain with HTTPS.

## 4. Before the first family signs up

- [ ] Backup taken and restore check passed ([`backup-and-recovery.md`](./backup-and-recovery.md)); restore
      into a spare project rehearsed once.
- [ ] Smoke check on the live site: sign up and confirm by email, add a player, give consent, sign in with
      a password and with an emailed link, reset a password.
- [ ] Staff check: create a program and session, assign a coach, add the player to the roster, take
      attendance, complete and publish an assessment, activate a Blueprint, check in, and publish a report.
      Then delete the test player (admin, in the database) before the pilot.
- [ ] Security headers present (`curl -I https://<pilot-address>/login` shows `content-security-policy`,
      `x-frame-options: DENY`) and `https://<pilot-address>/robots.txt` disallows all.
- [ ] Admin list reviewed; admins use strong, unique passwords.

## 5. After the pilot, before launch

- [ ] Pilot feedback reviewed with the owner; agreed fixes built, tested and merged (Sprint 5 continuation).
- [ ] Accessibility re-checked (the automated checks run in CI on every change) plus a manual pass with a
      screen reader on one phone.
- [ ] Decide whether the home page should appear in search engines; if so, set
      `NEXT_PUBLIC_ALLOW_INDEXING=true`. Signed-in pages always stay out.
- [ ] Backup schedule running and owned by a named person at PBP.

## Rollback

- App: redeploy the previous successful deployment from the host's dashboard. Data is unaffected.
- Database change gone wrong: stop, take a backup, then follow "Recovery" in
  [`backup-and-recovery.md`](./backup-and-recovery.md). Migrations are only ever added, never edited, so the
  previous app version keeps working unless a migration removed something it uses.
