# Project Blueprint Player Hub

## Project Charter, MVP Specification, and Claude Kickoff Brief

**Project owner:** Rick Cremen  
**Product:** Project Blueprint Athlete Development (PBP)  
**Project manager:** Codex / Jarvis  
**Build agent:** Claude Code  
**Status:** Sprint 0 — project initialization  
**Working slogan:** Prepare. Develop. Compete.  

---

## 1. Product vision

Build a parent-managed player development platform that connects every lacrosse athlete to Project Blueprint before, during, and after training.

The app will turn PBP from a series of training sessions into a measurable athlete-development system. Each athlete receives a living Blueprint containing a baseline assessment, development priorities, assigned work, player check-ins, coach feedback, and progress reports.

### Core promise

> Assess where the player is today, build the plan, assign the work, track completion, and prove development.

### Primary user journey

1. A parent creates an account.
2. The parent creates a player profile.
3. A PBP coach completes a baseline assessment.
4. The app creates the player's Blueprint.
5. The player completes assigned drills and weekly check-ins.
6. The coach records attendance, notes, and updated ratings.
7. The parent receives an end-of-cycle progress report.
8. The family registers for the next PBP program or training session.

---

## 2. Users and roles

### Parent or guardian

- Owns the account for minor players.
- Creates and manages player profiles.
- Provides required consent.
- Views assignments, attendance, coach notes, and reports.
- Submits player check-ins with or for the athlete.
- Accesses PBP registration and booking links.

### Coach

- Views assigned athletes.
- Records attendance.
- Completes assessments using 1–5 ratings.
- Assigns development priorities and drills.
- Adds parent-visible coach notes.
- Approves reports before they become visible to families.

### Administrator

- Manages users, coaches, programs, cycles, drills, and permissions.
- Assigns players to programs and coaches.
- Controls report publication.
- Reviews system activity.

### Player

For the MVP, a player does not have an independent account. The player interacts through the parent-managed account. This reduces privacy risk and keeps the initial experience simple.

---

## 3. Supported athletes

- Boys and girls lacrosse
- Graduation years 2027–2038
- Youth: grades 3–5
- Middle school: grades 6–8
- High school
- Experience levels: new player through 5+ years
- Positions: Attack, Midfield, Faceoff/Draw, Defense, LSM, and Goalie

---

## 4. MVP scope

### 4.1 Authentication and onboarding

- Email-based parent, coach, and administrator authentication
- Role-based access control
- Parent profile
- Parent consent record
- One parent can manage multiple players
- An administrator can invite coaches

### 4.2 Player profiles

Each player profile includes:

- First and last name
- Birth year
- Graduation year
- Age group
- Boys or girls lacrosse
- Primary and secondary position
- Experience level
- Current team or school, optional
- Player goals
- Strengths
- Improvement areas
- Emergency contact, optional for MVP

### 4.3 Programs and enrollment

- Program name
- Location
- Age group
- Start and end dates
- Session schedule
- Assigned coaches
- Roster
- Enrollment status
- External registration or payment link

The MVP will not process payments inside the app. It will link to the existing PBP registration/payment process.

### 4.4 Assessments

- Coach-selected position assessment
- 1–5 rating scale
- Baseline and follow-up assessment types
- Required coach comments
- Draft, submitted, approved, and published states
- Assessment history retained for comparison

Initial categories:

1. Stick skills
2. Footwork and athletic movement
3. Position fundamentals
4. Lacrosse IQ and decision-making
5. Communication, confidence, and effort

Assessment criteria must support age-group and position-specific variations without changing application code.

### 4.5 Player Blueprint

Each active Blueprint includes:

- Current assessment summary
- Three development priorities
- Coach-selected drills
- Weekly repetition targets
- At-home assignments
- Player goals
- Coach notes
- Start date and review date
- Status: active, completed, or archived

### 4.6 Drill library

- Drill title
- Description
- Coaching points
- Position
- Age group
- Skill category
- Equipment required
- Repetition or time target
- Optional video URL
- Active/inactive status

Coaches assign drills from the library. The MVP does not generate drills autonomously.

### 4.7 Weekly check-ins

- Assignment completed: yes/no
- Repetitions or minutes completed
- Confidence rating from 1–5
- Short reflection
- Question for coach
- Submission date

No open player-to-player messaging or social feed is permitted.

### 4.8 Attendance and coach notes

- Present, absent, excused, or makeup
- Session date
- Coach notes
- Parent-visible or staff-only note designation

### 4.9 Progress reports

The report includes:

- Player and program details
- Baseline and current ratings
- Change by category
- Attendance summary
- Completed work summary
- Coach observations
- Demonstrated strengths
- Next development priorities
- 30-day action plan
- Recommended next PBP program
- Coach approval and publication date

The MVP can use structured templates. AI-written reports will be added only after the core workflow is proven.

### 4.10 Dashboards

#### Parent dashboard

- Player cards
- Upcoming sessions
- Current Blueprint
- Weekly assignments
- Check-in status
- Latest published report
- Registration/booking action

#### Coach dashboard

- Today's sessions
- Assigned roster
- Missing assessments
- Missing check-ins
- Attendance entry
- Assessment and report approval queue

#### Administrator dashboard

- Users and roles
- Players
- Programs and rosters
- Coaches
- Drill library
- Assessment templates
- Report publication

---

## 5. Explicitly out of scope for the MVP

- Automated video or film analysis
- College recruiting workflows
- Player-to-player messaging
- Public profiles
- Social feeds
- Subscriptions
- Native iOS and Android applications
- Wearable-device integration
- Automated AI coaching without coach approval
- In-app payment processing
- Team chat

These features may be evaluated after families and coaches successfully use the core assessment-to-report workflow.

---

## 6. Product and safety requirements

- Parent-managed accounts for minor players
- No public player information
- No searchable player directory
- No direct messaging between minors
- Every parent-visible report requires coach approval
- Collect only information needed to deliver the service
- Provide a method to request account and player-data deletion
- Maintain an audit trail for assessment and report publication
- Use secure authentication and server-side authorization checks
- Do not expose private database keys in browser code
- Include clear privacy and parental-consent language before production launch

This specification is product guidance, not a substitute for a formal legal/privacy review before public launch.

---

## 7. Recommended technical architecture

### MVP platform

Build an installable responsive web application first. It should work well on phones, tablets, and desktops and be capable of becoming a Progressive Web App.

### Stack

- Next.js with App Router
- TypeScript with strict mode
- Tailwind CSS
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage only if file storage becomes necessary
- Row Level Security on all private tables
- Vercel deployment
- Vitest or Jest for unit tests
- Playwright for core end-to-end tests

### Later integrations

- Resend for transactional email
- Stripe for payments
- Claude API for coach-approved narrative reports
- Error monitoring and analytics selected before public launch

### Branding

- Deep navy
- Burnt orange
- Carolina blue
- White
- Clean athletic design
- Wilmington/Cape Fear identity
- Project Blueprint Athlete Development
- “Building Athletes. Developing Leaders.”
- “Prepare. Develop. Compete.”

---

## 8. Initial data model

Claude should propose migrations for at least these entities:

- `profiles`
- `parent_player_relationships`
- `players`
- `coaches`
- `programs`
- `program_sessions`
- `enrollments`
- `attendance`
- `assessment_templates`
- `assessment_criteria`
- `assessments`
- `assessment_scores`
- `blueprints`
- `blueprint_priorities`
- `drills`
- `blueprint_drills`
- `weekly_checkins`
- `coach_notes`
- `progress_reports`
- `consent_records`
- `audit_events`

Every table must have ownership, timestamps, appropriate foreign keys, and documented access rules.

---

## 9. Delivery phases

### Sprint 0 — foundation

- Create repository and project
- Add project documentation
- Establish coding standards
- Configure local environment
- Create application shell
- Create database design and migrations
- Add authentication and role structure
- Add automated checks

### Sprint 1 — parent and player onboarding

- Parent authentication
- Parent dashboard shell
- Create and edit player profiles
- Parent-player relationships
- Consent record

### Sprint 2 — programs and coach workflow

- Programs and sessions
- Rosters
- Coach assignments
- Attendance
- Coach dashboard

### Sprint 3 — assessment and Blueprint

- Assessment templates
- 1–5 scoring
- Baseline assessment
- Blueprint priorities
- Drill library and assignments

### Sprint 4 — check-ins and reporting

- Weekly check-ins
- Progress comparison
- Report template
- Coach approval
- Parent report view

### Sprint 5 — pilot and launch readiness

- Pilot with a small PBP group
- Fix usability problems
- Privacy review
- Accessibility review
- Backup and recovery checks
- Production deployment

---

## 10. Definition of done

A task is complete only when:

- The requested behavior works.
- Authorization is enforced server-side.
- Type checking passes.
- Linting passes.
- Relevant automated tests pass.
- Mobile and desktop layouts are checked.
- Loading, empty, validation, and error states exist.
- Documentation is updated.
- No secrets are committed.
- Claude reports exactly what changed and any remaining risks.

---

## 11. Working agreement: owner, project manager, and contractor

### Rick — product owner

- Approves business decisions, branding, terminology, and workflows.
- Supplies final assessment criteria, drill content, and program details.
- Tests the product as a coach/business owner.

### Codex / Jarvis — project manager

- Maintains scope, priorities, acceptance criteria, and decision log.
- Converts business decisions into Claude assignments.
- Reviews Claude's output and identifies defects or scope drift.
- Tracks completed work, blockers, and next actions.
- Does not approve production launch without verification.

### Claude Code — build contractor

- Implements one assigned milestone at a time.
- Works in the shared repository.
- Does not change approved scope without documenting the need.
- Runs tests and reports results.
- Requests a decision when requirements conflict.
- Never commits credentials or production secrets.

### Handoff loop

1. Codex issues a scoped assignment with acceptance criteria.
2. Rick gives that assignment to Claude Code.
3. Claude implements, tests, and commits the work.
4. Rick shares Claude's completion report or repository changes with Codex.
5. Codex reviews the result and issues corrections or the next assignment.

---

## 12. Master kickoff prompt for Claude Code

Copy everything between `START PROMPT` and `END PROMPT` into Claude Code.

### START PROMPT

You are the build contractor for the Project Blueprint Player Hub, a parent-managed lacrosse player-development application for Project Blueprint Athlete Development.

Rick Cremen is the product owner. Codex/Jarvis is the project manager. You must implement only the currently assigned milestone, report your work clearly, and avoid expanding scope without approval.

Read the complete project charter and treat it as the source of truth. The product's core workflow is:

Parent account → Player profile → Coach assessment → Personal Blueprint → Assigned drills → Weekly check-ins → Coach feedback → Progress report → Next PBP registration.

The MVP is an installable responsive web application built with Next.js App Router, TypeScript strict mode, Tailwind CSS, Supabase Auth/PostgreSQL, Row Level Security, Vercel, unit tests, and Playwright. Parent accounts manage minor players. There must be no public player directory, player-to-player messaging, social feed, automated film analysis, recruiting workflow, subscriptions, native mobile app, or autonomous AI coaching in the MVP.

Your first assignment is Sprint 0 only.

Sprint 0 deliverables:

1. Inspect the repository and report its current state before making changes.
2. If the repository is empty, initialize a current stable Next.js application with App Router, TypeScript strict mode, ESLint, Tailwind CSS, and a `src` directory.
3. Add a concise `README.md` with setup, scripts, architecture, and environment instructions.
4. Add `.env.example` containing variable names only—never real credentials.
5. Create a clean mobile-first application shell using the approved PBP colors and branding.
6. Create placeholder routes for `/`, `/login`, `/parent`, `/coach`, and `/admin`.
7. Create shared layout/navigation components that respect role-specific destinations without pretending authentication already exists.
8. Propose the Supabase database schema as versioned SQL migrations, including tables, foreign keys, timestamps, indexes, and an initial Row Level Security strategy.
9. Do not connect to a production Supabase project yet. Keep local configuration documented and isolated.
10. Add basic unit tests and one Playwright smoke test covering the public landing page and route availability.
11. Run formatting, linting, type checking, unit tests, and the Playwright smoke test. Fix failures caused by your implementation.
12. Do not implement payments, messaging, AI generation, film analysis, or college recruiting.

Before implementation, provide:

- Your understanding of Sprint 0
- The repository state
- Your proposed file and database structure
- Any true blockers requiring a product-owner decision

After implementation, provide:

- Summary of completed work
- Files created or changed
- Database/security decisions
- Commands and test results
- Screens or routes available for review
- Known limitations
- Questions or decisions needed for Sprint 1

Do not claim a test passed unless you actually ran it. Do not use mock security as a substitute for Row Level Security. Do not commit secrets. Keep the implementation straightforward and maintainable for a small business.

### END PROMPT

---

## 13. Project manager review checklist for Sprint 0

Codex will evaluate Claude's Sprint 0 delivery against these points:

- Repository initializes and runs locally
- Application uses the requested stack
- Routes exist and render without crashing
- Mobile navigation is usable
- Branding is recognizable but not overdesigned
- SQL migrations are valid and ordered
- Relationships support multiple players per parent
- Role permissions are designed explicitly
- Row Level Security policies do not expose other families' data
- Environment variables contain no secrets
- Tests were actually executed
- README lets another developer run the project
- No out-of-scope features were added

---

## 14. Immediate owner actions

1. Create or select the Git repository for the app.
2. Open that repository with Claude Code.
3. Place this charter in the repository root as `PROJECT_CHARTER.md`.
4. Paste the master kickoff prompt into Claude Code.
5. Let Claude finish Sprint 0 and provide its completion report.
6. Return the report and repository link or changed files to Codex for review before beginning Sprint 1.

