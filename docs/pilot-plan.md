# Pilot plan

A short, low-risk trial of the whole cycle with a small PBP group before the app is offered to every family.
Draft for the owner to adjust.

## Who

- **3–5 families** who already train with PBP and are comfortable giving honest feedback. At least one
  should mainly use a phone, and at least one an older or smaller device.
- **1–2 coaches** and **one admin** (ideally not the developer).
- A named PBP contact who reads the feedback address (`NEXT_PUBLIC_FEEDBACK_EMAIL`) during the pilot.

## When and how long

About four weeks, the length of one Blueprint cycle. It starts only after every item in section 4 of the
[launch checklist](./launch-checklist.md) is ticked, including lawyer-approved legal wording, because real
children's information will be entered.

## What each group does

| Week | Families                                          | Coaches                                                   | Admin                                 |
| ---- | ------------------------------------------------- | --------------------------------------------------------- | ------------------------------------- |
| 0    | Create an account, add their player, give consent | Sign up (promoted to coach by the admin)                  | Create the program, sessions, rosters |
| 1    | See upcoming sessions                             | Take attendance; complete and submit baseline assessments | Publish approved assessments          |
| 1–2  | Read the assessment; see the Blueprint            | Build and activate Blueprints (priorities, drills)        | —                                     |
| 2–4  | Weekly check-ins (with a question for the coach)  | Watch check-ins and questions; take attendance            | —                                     |
| 4    | Read the progress report                          | Follow-up assessment; write, submit and approve reports   | Publish reports                       |

## What we measure

- Can each person finish their tasks without help? Note every place someone got stuck or asked a question.
- Weekly check-in rate: check-ins submitted ÷ weeks in the plan (the report shows this per player).
- Time for a coach to complete an assessment and a report.
- Errors or confusing messages (screenshot and email them).
- A 5-question survey at the end: ease of use (1–5), most useful part, most confusing part, anything
  missing, would you recommend it to another PBP family.

## Ground rules

- Only pilot families' real information is entered. No other families, and no medical details in free-text
  fields.
- Anything that looks like a privacy or access problem (for example, seeing another family's player) is
  reported immediately. The admin pauses the pilot until it is fixed.
- Backups weekly, with a restore check ([`backup-and-recovery.md`](./backup-and-recovery.md)).

## After the pilot

1. Collect the feedback into a list; the owner and project manager decide what to fix before launch.
2. Fixes are built, tested and merged like every sprint (draft PR, preview, approval).
3. Decide on launch timing, search-engine visibility and the backup owner (launch checklist section 5).
