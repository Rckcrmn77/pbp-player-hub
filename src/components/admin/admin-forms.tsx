"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SelectField, TextAreaField, TextField } from "@/components/forms/fields";
import { FormMessage, SubmitButton } from "@/components/forms/form-status";
import { ageGroupOptions, programOptions } from "@/config/player-options";
import {
  assignmentRoleOptions,
  enrollmentStatusOptions,
  programStatusOptions,
} from "@/config/program-options";
import type { ProgramRow } from "@/lib/supabase/types";
import { idleState, type FormState } from "@/lib/validation/form";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

function programValues(program?: ProgramRow): Record<string, string> {
  if (!program) return { status: "draft" };
  return {
    name: program.name,
    location: program.location ?? "",
    ageGroup: program.age_group ?? "",
    program: program.program ?? "",
    startDate: program.start_date,
    endDate: program.end_date,
    scheduleDescription: program.schedule_description ?? "",
    registrationUrl: program.registration_url ?? "",
    status: program.status,
  };
}

export function ProgramForm({
  action,
  program,
  cancelHref,
}: {
  action: Action;
  program?: ProgramRow;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const v = state.values ?? programValues(program);
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <TextField name="name" label="Program name" defaultValue={v.name} errors={e.name} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="location" label="Location" optional defaultValue={v.location} errors={e.location} />
        <SelectField
          name="status"
          label="Status"
          options={programStatusOptions.map((o) => ({
            value: o.value,
            label: `${o.label} (${o.hint.toLowerCase()})`,
          }))}
          defaultValue={v.status}
          errors={e.status}
        />
        <SelectField
          name="ageGroup"
          label="Age group"
          optional
          placeholder="All age groups"
          options={ageGroupOptions}
          defaultValue={v.ageGroup}
          errors={e.ageGroup}
        />
        <SelectField
          name="program"
          label="Boys or girls"
          optional
          options={programOptions}
          defaultValue={v.program}
          errors={e.program}
        />
        <TextField
          name="startDate"
          label="Start date"
          type="date"
          defaultValue={v.startDate}
          errors={e.startDate}
        />
        <TextField name="endDate" label="End date" type="date" defaultValue={v.endDate} errors={e.endDate} />
      </div>
      <TextAreaField
        name="scheduleDescription"
        label="Schedule"
        optional
        hint="For families, e.g. “Mondays and Wednesdays, 5:00–6:30 PM”."
        defaultValue={v.scheduleDescription}
        errors={e.scheduleDescription}
      />
      <TextField
        name="registrationUrl"
        label="Registration and payment link"
        type="url"
        optional
        hint="PBP's existing registration page. The app does not take payments."
        defaultValue={v.registrationUrl}
        errors={e.registrationUrl}
      />
      <div className="flex flex-wrap items-center gap-4 border-t border-navy/10 pt-5">
        <SubmitButton pendingText="Saving…">{program ? "Save changes" : "Create program"}</SubmitButton>
        <Link href={cancelHref} className="font-medium text-carolina-dark underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}

export function AddSessionsForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, idleState);
  const v = state.values ?? { repeatWeeks: "1" };
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField name="date" label="First date" type="date" defaultValue={v.date} errors={e.date} />
        <TextField
          name="startTime"
          label="Start time"
          type="time"
          defaultValue={v.startTime}
          errors={e.startTime}
        />
        <TextField name="endTime" label="End time" type="time" defaultValue={v.endTime} errors={e.endTime} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="location"
          label="Location"
          optional
          hint="Leave blank to use the program location."
          defaultValue={v.location}
          errors={e.location}
        />
        <SelectField
          name="repeatWeeks"
          label="Repeat"
          options={Array.from({ length: 20 }, (_, i) => ({
            value: i + 1,
            label: i === 0 ? "Just this date" : `Every week for ${i + 1} weeks`,
          }))}
          defaultValue={v.repeatWeeks}
          errors={e.repeatWeeks}
        />
      </div>
      <p className="text-sm text-navy/60">Times are Eastern (Wilmington) time.</p>
      <div>
        <SubmitButton pendingText="Adding…">Add sessions</SubmitButton>
      </div>
    </form>
  );
}

export function AssignCoachForm({
  action,
  coaches,
}: {
  action: Action;
  coaches: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState(action, idleState);
  const v = state.values ?? { assignmentRole: "assistant" };
  const e = state.fieldErrors ?? {};
  if (coaches.length === 0) {
    return (
      <p className="text-sm text-navy/70">
        No other active coaches. Promote an account to coach on the{" "}
        <Link href="/admin/people" className="font-medium text-carolina-dark underline">
          People
        </Link>{" "}
        page first.
      </p>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="coachId"
          label="Coach"
          options={coaches.map((c) => ({ value: c.id, label: c.name }))}
          defaultValue={v.coachId}
          errors={e.coachId}
        />
        <SelectField
          name="assignmentRole"
          label="Role"
          options={assignmentRoleOptions}
          defaultValue={v.assignmentRole}
          errors={e.assignmentRole}
        />
      </div>
      <div>
        <SubmitButton pendingText="Assigning…">Assign coach</SubmitButton>
      </div>
    </form>
  );
}

export function EnrollPlayerForm({
  action,
  players,
}: {
  action: Action;
  players: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState(action, idleState);
  const v = state.values ?? { status: "active" };
  const e = state.fieldErrors ?? {};
  if (players.length === 0) {
    return (
      <p className="text-sm text-navy/70">
        Every player is already on this roster, or no families have added players yet.
      </p>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="playerId"
          label="Player"
          options={players.map((p) => ({ value: p.id, label: p.label }))}
          defaultValue={v.playerId}
          errors={e.playerId}
        />
        <SelectField
          name="status"
          label="Roster status"
          options={enrollmentStatusOptions}
          defaultValue={v.status}
          errors={e.status}
        />
      </div>
      <div>
        <SubmitButton pendingText="Adding…">Add to roster</SubmitButton>
      </div>
    </form>
  );
}
