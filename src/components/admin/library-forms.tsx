"use client";

import Link from "next/link";
import { useActionState } from "react";

import { SelectField, TextAreaField, TextField } from "@/components/forms/fields";
import { FormMessage, SubmitButton } from "@/components/forms/form-status";
import { charterCategories } from "@/config/assessment";
import { ageGroupOptions, positionOptions } from "@/config/player-options";
import type { AssessmentTemplateRow, DrillRow } from "@/lib/supabase/types";
import { idleState, type FormState } from "@/lib/validation/form";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

function CheckboxGroup({
  name,
  legend,
  options,
  selected,
  hint,
}: {
  name: string;
  legend: string;
  options: { value: string; label: string }[];
  selected: string[];
  hint?: string;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      {hint && <p className="text-sm text-navy/70">{hint}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className="flex items-center gap-2 rounded-md border border-navy/15 bg-white px-3 py-1.5 text-sm has-[:checked]:border-carolina-dark has-[:checked]:bg-carolina-light"
          >
            <input
              type="checkbox"
              name={name}
              value={o.value}
              defaultChecked={selected.includes(o.value)}
              className="accent-orange"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ActiveSwitch({ label, defaultChecked }: { label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      <input
        type="checkbox"
        name="isActive"
        defaultChecked={defaultChecked}
        className="size-4 accent-orange"
      />
      {label}
    </label>
  );
}

export function DrillForm({ action, drill }: { action: Action; drill?: DrillRow }) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {
    title: drill?.title ?? "",
    description: drill?.description ?? "",
    coachingPoints: drill?.coaching_points ?? "",
    skillCategory: drill?.skill_category ?? "",
    equipment: drill?.equipment ?? "",
    targetReps: drill?.target_reps?.toString() ?? "",
    targetMinutes: drill?.target_minutes?.toString() ?? "",
    videoUrl: drill?.video_url ?? "",
  };
  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <TextField name="title" label="Drill title" defaultValue={v.title} errors={e.title} />
      <TextField
        name="skillCategory"
        label="Skill category"
        list="skill-categories"
        hint="Pick one of the assessment categories or type your own."
        defaultValue={v.skillCategory}
        errors={e.skillCategory}
      />
      <datalist id="skill-categories">
        {charterCategories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <TextAreaField
        name="description"
        label="How to do it"
        optional
        rows={4}
        defaultValue={v.description}
        errors={e.description}
      />
      <TextAreaField
        name="coachingPoints"
        label="Coaching points"
        optional
        hint="What players should focus on."
        defaultValue={v.coachingPoints}
        errors={e.coachingPoints}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          name="equipment"
          label="Equipment"
          optional
          defaultValue={v.equipment}
          errors={e.equipment}
        />
        <TextField
          name="targetReps"
          label="Suggested reps"
          inputMode="numeric"
          optional
          defaultValue={v.targetReps}
          errors={e.targetReps}
        />
        <TextField
          name="targetMinutes"
          label="Suggested minutes"
          inputMode="numeric"
          optional
          defaultValue={v.targetMinutes}
          errors={e.targetMinutes}
        />
      </div>
      <TextField
        name="videoUrl"
        label="Video link"
        type="url"
        optional
        hint="A link to a demonstration video (https://)."
        defaultValue={v.videoUrl}
        errors={e.videoUrl}
      />
      <CheckboxGroup
        name="positions"
        legend="Positions"
        hint="Leave all unticked if the drill suits every position."
        options={positionOptions}
        selected={drill?.positions ?? []}
      />
      <CheckboxGroup
        name="ageGroups"
        legend="Age groups"
        hint="Leave all unticked if the drill suits every age group."
        options={ageGroupOptions}
        selected={drill?.age_groups ?? []}
      />
      <ActiveSwitch label="Available to assign" defaultChecked={drill?.is_active ?? true} />
      <div className="flex flex-wrap items-center gap-4 border-t border-navy/10 pt-5">
        <SubmitButton pendingText="Saving…">{drill ? "Save drill" : "Add drill"}</SubmitButton>
        <Link href="/admin/drills" className="font-medium text-carolina-dark underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}

export function TemplateForm({ action, template }: { action: Action; template?: AssessmentTemplateRow }) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {
    name: template?.name ?? "",
    description: template?.description ?? "",
    ageGroup: template?.age_group ?? "",
    position: template?.position ?? "",
  };
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <TextField name="name" label="Template name" defaultValue={v.name} errors={e.name} />
      <TextAreaField
        name="description"
        label="Description"
        optional
        defaultValue={v.description}
        errors={e.description}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          name="ageGroup"
          label="For age group"
          optional
          options={ageGroupOptions}
          defaultValue={v.ageGroup}
          errors={e.ageGroup}
        />
        <SelectField
          name="position"
          label="For position"
          optional
          options={positionOptions}
          defaultValue={v.position}
          errors={e.position}
        />
      </div>
      <p className="text-sm text-navy/70">
        “None” means the template can be used for every age group or position.
      </p>
      <ActiveSwitch label="Coaches can use this template" defaultChecked={template?.is_active ?? true} />
      <div>
        <SubmitButton pendingText="Saving…">{template ? "Save template" : "Create template"}</SubmitButton>
      </div>
    </form>
  );
}

export function AddCriterionForm({ action, nextSortOrder }: { action: Action; nextSortOrder: number }) {
  const [state, formAction] = useActionState(action, idleState);
  const e = state.fieldErrors ?? {};
  const v = state.values ?? { sortOrder: String(nextSortOrder) };
  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_8rem]">
        <TextField
          name="category"
          label="Category"
          list="criterion-categories"
          defaultValue={v.category}
          errors={e.category}
        />
        <TextField name="name" label="What is rated" defaultValue={v.name} errors={e.name} />
        <TextField
          name="sortOrder"
          label="Order"
          inputMode="numeric"
          defaultValue={v.sortOrder}
          errors={e.sortOrder}
        />
      </div>
      <datalist id="criterion-categories">
        {charterCategories.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <TextAreaField
        name="description"
        label="Guidance for coaches"
        optional
        hint="What a 1, 3 and 5 look like, for consistent ratings."
        defaultValue={v.description}
        errors={e.description}
      />
      <div>
        <SubmitButton pendingText="Adding…">Add criterion</SubmitButton>
      </div>
    </form>
  );
}
