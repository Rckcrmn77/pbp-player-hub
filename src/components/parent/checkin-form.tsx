"use client";

import { useActionState } from "react";

import { TextAreaField, TextField } from "@/components/forms/fields";
import { FormMessage, SubmitButton } from "@/components/forms/form-status";
import { confidenceScale } from "@/config/progress";
import { idleState, type FormState } from "@/lib/validation/form";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

const choice =
  "flex min-w-0 cursor-pointer flex-col items-center rounded-md border border-navy/15 px-1 py-2 text-center text-sm " +
  "has-[:checked]:border-carolina-dark has-[:checked]:bg-carolina-light has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-carolina";

function ChoiceGroup({
  name,
  legend,
  options,
  defaultValue,
  errors,
  columns,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string; detail?: string }[];
  defaultValue?: string;
  errors?: string[];
  columns: string;
}) {
  return (
    <fieldset aria-describedby={errors?.length ? `${name}-error` : undefined}>
      <legend className="text-sm font-medium">{legend}</legend>
      <div className={`mt-1 grid gap-2 ${columns}`}>
        {options.map((o) => (
          <label key={o.value} className={choice}>
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={o.value}
              defaultChecked={defaultValue === o.value}
            />
            <span className="font-semibold">{o.label}</span>
            {o.detail && <span className="text-xs leading-tight break-words text-navy/60">{o.detail}</span>}
          </label>
        ))}
      </div>
      {errors?.length ? (
        <p id={`${name}-error`} className="mt-1 text-sm font-medium text-orange-dark">
          {errors[0]}
        </p>
      ) : null}
    </fieldset>
  );
}

export type CheckinDefaults = {
  assignmentCompleted?: "yes" | "no";
  repsCompleted?: string;
  minutesCompleted?: string;
  confidence?: string;
  reflection?: string;
  questionForCoach?: string;
};

export function CheckinForm({
  action,
  weekStart,
  weekLabel,
  defaults,
  playerName,
  editing,
}: {
  action: Action;
  weekStart: string;
  weekLabel: string;
  defaults: CheckinDefaults;
  playerName: string;
  editing: boolean;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.fieldErrors ?? {};
  const v: Record<string, string | undefined> = state.values ?? defaults;
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="weekStart" value={weekStart} />
      <div>
        <h2 className="text-lg font-semibold">{weekLabel}</h2>
        {e.weekStart?.length ? (
          <p className="text-sm font-medium text-orange-dark">{e.weekStart[0]}</p>
        ) : null}
      </div>
      <ChoiceGroup
        name="assignmentCompleted"
        legend={`Did ${playerName} complete this week's assignment?`}
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
        defaultValue={v.assignmentCompleted}
        errors={e.assignmentCompleted}
        columns="grid-cols-2 sm:max-w-xs"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="repsCompleted"
          label="Reps completed"
          inputMode="numeric"
          optional
          defaultValue={v.repsCompleted}
          errors={e.repsCompleted}
        />
        <TextField
          name="minutesCompleted"
          label="Minutes practiced"
          inputMode="numeric"
          optional
          defaultValue={v.minutesCompleted}
          errors={e.minutesCompleted}
        />
      </div>
      <ChoiceGroup
        name="confidence"
        legend="How confident does the player feel about this week's work?"
        options={confidenceScale.map((c) => ({
          value: String(c.value),
          label: String(c.value),
          detail: c.label,
        }))}
        defaultValue={v.confidence}
        errors={e.confidence}
        columns="grid-cols-5 sm:max-w-xl"
      />
      <TextAreaField
        name="reflection"
        label="Short reflection"
        optional
        hint="What went well? What was hard?"
        defaultValue={v.reflection}
        errors={e.reflection}
      />
      <TextAreaField
        name="questionForCoach"
        label="Question for the coach"
        optional
        hint="Your coach sees this with the check-in."
        rows={2}
        defaultValue={v.questionForCoach}
        errors={e.questionForCoach}
      />
      <div>
        <SubmitButton pendingText="Saving…">{editing ? "Update check-in" : "Submit check-in"}</SubmitButton>
      </div>
    </form>
  );
}
