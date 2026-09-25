"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { SelectField, TextAreaField } from "@/components/forms/fields";
import { FormMessage } from "@/components/forms/form-status";
import type { ProgressReportRow } from "@/lib/supabase/types";
import { idleState, type FormState } from "@/lib/validation/form";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

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

export function ReportForm({
  action,
  report,
  programs,
  suggestedPriorities,
}: {
  action: Action;
  report: ProgressReportRow;
  programs: { id: string; name: string }[];
  suggestedPriorities: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {
    coachObservations: report.coach_observations ?? "",
    strengths: report.strengths ?? "",
    nextPriorities: report.next_priorities ?? suggestedPriorities,
    actionPlan: report.action_plan_30_day ?? "",
    recommendedProgramId: report.recommended_program_id ?? "",
  };
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <TextAreaField
        name="coachObservations"
        label="Coach observations"
        hint="Required before submitting. What you saw over this cycle."
        rows={5}
        defaultValue={v.coachObservations}
        errors={e.coachObservations}
      />
      <TextAreaField
        name="strengths"
        label="Demonstrated strengths"
        optional
        defaultValue={v.strengths}
        errors={e.strengths}
      />
      <TextAreaField
        name="nextPriorities"
        label="Next development priorities"
        optional
        hint="Starts from the Blueprint's priorities; edit freely."
        defaultValue={v.nextPriorities}
        errors={e.nextPriorities}
      />
      <TextAreaField
        name="actionPlan"
        label="30-day action plan"
        optional
        rows={4}
        defaultValue={v.actionPlan}
        errors={e.actionPlan}
      />
      <SelectField
        name="recommendedProgramId"
        label="Recommended next PBP program"
        optional
        options={programs.map((p) => ({ value: p.id, label: p.name }))}
        defaultValue={v.recommendedProgramId}
        errors={e.recommendedProgramId}
      />
      <IntentButtons />
    </form>
  );
}
