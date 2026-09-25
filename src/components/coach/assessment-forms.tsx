"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/forms/fields";
import { FormMessage, SubmitButton } from "@/components/forms/form-status";
import { ratingScale } from "@/config/assessment";
import type {
  AssessmentCriterionRow,
  AssessmentScoreRow,
  BlueprintPriorityRow,
  BlueprintRow,
} from "@/lib/supabase/types";
import { idleState, type FormState } from "@/lib/validation/form";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

export function StartAssessmentForm({
  action,
  templates,
  programs,
  defaultType,
  today,
}: {
  action: Action;
  templates: { id: string; label: string }[];
  programs: { id: string; name: string }[];
  defaultType: "baseline" | "follow_up";
  today: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {
    templateId: templates.length === 1 ? templates[0].id : "",
    assessmentType: defaultType,
    programId: programs.length === 1 ? programs[0].id : "",
    assessedOn: today,
  };
  if (templates.length === 0) {
    return (
      <p className="text-sm text-navy/70">
        No assessment templates are available yet. An administrator creates them.
      </p>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="templateId"
          label="Template"
          options={templates.map((t) => ({ value: t.id, label: t.label }))}
          defaultValue={v.templateId}
          errors={e.templateId}
        />
        <SelectField
          name="assessmentType"
          label="Type"
          options={[
            { value: "baseline", label: "Baseline" },
            { value: "follow_up", label: "Follow-up" },
          ]}
          defaultValue={v.assessmentType}
          errors={e.assessmentType}
        />
        <SelectField
          name="programId"
          label="Program"
          optional
          options={programs.map((p) => ({ value: p.id, label: p.name }))}
          defaultValue={v.programId}
          errors={e.programId}
        />
        <TextField
          name="assessedOn"
          label="Date"
          type="date"
          defaultValue={v.assessedOn}
          errors={e.assessedOn}
        />
      </div>
      <div>
        <SubmitButton pendingText="Starting…">Start assessment</SubmitButton>
      </div>
    </form>
  );
}

function IntentButtons() {
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="submit"
        name="intent"
        value="save"
        disabled={pending}
        className="rounded-md border border-navy/20 bg-white px-4 py-2.5 font-semibold hover:border-carolina-dark disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save draft"}
      </button>
      <button
        type="submit"
        name="intent"
        value="submit"
        disabled={pending}
        className="rounded-md bg-orange px-4 py-2.5 font-semibold text-white hover:bg-orange-dark disabled:opacity-60"
      >
        Save and submit for approval
      </button>
    </div>
  );
}

export function AssessmentEditor({
  action,
  criteria,
  scores,
  summary,
}: {
  action: Action;
  criteria: AssessmentCriterionRow[];
  scores: AssessmentScoreRow[];
  summary: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const saved = new Map(scores.map((s) => [s.criterion_id, s]));
  const value = (key: string, fallback: string) => state.values?.[key] ?? fallback;
  const active = criteria.filter((c) => c.is_active);
  const categories = [...new Set(active.map((c) => c.category))];

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <FormMessage state={state} />
      {categories.map((category) => (
        <fieldset
          key={category}
          className="flex flex-col gap-4 rounded-xl border border-navy/10 bg-white p-5"
        >
          <legend className="px-1 text-lg font-semibold">{category}</legend>
          {active
            .filter((c) => c.category === category)
            .map((c) => {
              const rating = value(`rating:${c.id}`, saved.get(c.id)?.rating.toString() ?? "");
              const ratingErrors = state.fieldErrors?.[`rating:${c.id}`];
              return (
                <div
                  key={c.id}
                  className="flex flex-col gap-2 border-t border-navy/10 pt-4 first-of-type:border-0 first-of-type:pt-0"
                >
                  <div>
                    <p className="font-medium">{c.name}</p>
                    {c.description && <p className="text-sm text-navy/70">{c.description}</p>}
                  </div>
                  <div
                    role="radiogroup"
                    aria-label={`Rating for ${c.name}`}
                    className="grid grid-cols-5 gap-1 sm:max-w-xl"
                  >
                    {ratingScale.map((r) => (
                      <label
                        key={r.value}
                        className="flex cursor-pointer flex-col items-center rounded-md border border-navy/15 px-1 py-1.5 text-center text-xs has-[:checked]:border-carolina-dark has-[:checked]:bg-carolina-light has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-carolina"
                      >
                        <input
                          type="radio"
                          className="sr-only"
                          name={`rating:${c.id}`}
                          value={r.value}
                          defaultChecked={rating === String(r.value)}
                          aria-label={r.label}
                        />
                        <span className="text-base font-bold">{r.value}</span>
                        <span className="hidden text-navy/70 sm:block">{r.label.split(" · ")[1]}</span>
                      </label>
                    ))}
                  </div>
                  {ratingErrors && <p className="text-sm font-medium text-orange-dark">{ratingErrors[0]}</p>}
                  <label htmlFor={`comment:${c.id}`} className="sr-only">
                    Comment on {c.name}
                  </label>
                  <textarea
                    id={`comment:${c.id}`}
                    name={`comment:${c.id}`}
                    rows={2}
                    placeholder="Comment (required before submitting)"
                    defaultValue={value(`comment:${c.id}`, saved.get(c.id)?.comment ?? "")}
                    className="block w-full rounded-md border border-navy/20 bg-white px-3 py-2 text-base placeholder:text-navy/40 focus:border-carolina-dark focus:ring-2 focus:ring-carolina/40 focus:outline-none"
                  />
                </div>
              );
            })}
        </fieldset>
      ))}
      <TextAreaField
        name="summary"
        label="Overall summary"
        optional
        rows={4}
        hint="The family sees this once the assessment is published."
        defaultValue={value("summary", summary)}
        errors={state.fieldErrors?.summary}
      />
      <IntentButtons />
    </form>
  );
}

// ---------------------------------------------------------------------------
// Blueprints
// ---------------------------------------------------------------------------

export function BlueprintDetailsForm({ action, blueprint }: { action: Action; blueprint: BlueprintRow }) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {
    playerGoals: blueprint.player_goals ?? "",
    coachSummary: blueprint.coach_summary ?? "",
    startDate: blueprint.start_date,
    reviewDate: blueprint.review_date ?? "",
  };
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <TextAreaField
        name="playerGoals"
        label="Player goals"
        optional
        defaultValue={v.playerGoals}
        errors={e.playerGoals}
      />
      <TextAreaField
        name="coachSummary"
        label="Message to the family"
        optional
        hint="What this Blueprint focuses on and why."
        defaultValue={v.coachSummary}
        errors={e.coachSummary}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="startDate"
          label="Start date"
          type="date"
          defaultValue={v.startDate}
          errors={e.startDate}
        />
        <TextField
          name="reviewDate"
          label="Review date"
          type="date"
          optional
          defaultValue={v.reviewDate}
          errors={e.reviewDate}
        />
      </div>
      <div>
        <SubmitButton pendingText="Saving…">Save details</SubmitButton>
      </div>
    </form>
  );
}

export function PriorityForm({
  action,
  rank,
  priority,
}: {
  action: Action;
  rank: number;
  priority?: BlueprintPriorityRow;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? { title: priority?.title ?? "", description: priority?.description ?? "" };
  return (
    <form action={formAction} className="flex flex-col gap-3" noValidate>
      <input type="hidden" name="rank" value={rank} />
      <FormMessage state={state} />
      <TextField
        name="title"
        id={`priority-${rank}-title`}
        label={`Priority ${rank}`}
        defaultValue={v.title}
        errors={e.title}
      />
      <TextAreaField
        name="description"
        id={`priority-${rank}-description`}
        label="What success looks like"
        optional
        defaultValue={v.description}
        errors={e.description}
      />
      <div>
        <SubmitButton pendingText="Saving…">Save priority {rank}</SubmitButton>
      </div>
    </form>
  );
}

export function AssignDrillForm({
  action,
  drills,
}: {
  action: Action;
  drills: { id: string; label: string }[];
}) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? { isAtHome: "on" };
  if (drills.length === 0) {
    return (
      <p className="text-sm text-navy/70">
        No more drills to assign. An administrator adds drills to the library.
      </p>
    );
  }
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <SelectField
        name="drillId"
        label="Drill"
        options={drills.map((d) => ({ value: d.id, label: d.label }))}
        defaultValue={v.drillId}
        errors={e.drillId}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="weeklyReps"
          label="Reps per week"
          inputMode="numeric"
          optional
          defaultValue={v.weeklyReps}
          errors={e.weeklyReps}
        />
        <TextField
          name="weeklyMinutes"
          label="Minutes per week"
          inputMode="numeric"
          optional
          defaultValue={v.weeklyMinutes}
          errors={e.weeklyMinutes}
        />
      </div>
      <TextAreaField
        name="instructions"
        label="Instructions for the player"
        optional
        defaultValue={v.instructions}
        errors={e.instructions}
      />
      <CheckboxField
        name="isAtHome"
        required={false}
        defaultChecked={v.isAtHome === "on"}
        label="At-home assignment (shown in the family's weekly work)"
      />
      <div>
        <SubmitButton pendingText="Assigning…">Assign drill</SubmitButton>
      </div>
    </form>
  );
}
