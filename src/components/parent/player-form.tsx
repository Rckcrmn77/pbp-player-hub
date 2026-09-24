"use client";

import Link from "next/link";
import { useActionState } from "react";

import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/forms/fields";
import { FormMessage, SubmitButton } from "@/components/forms/form-status";
import { legalDocuments } from "@/config/legal";
import {
  ageGroupOptions,
  BIRTH_YEAR_MAX,
  BIRTH_YEAR_MIN,
  experienceOptions,
  GRADUATION_YEAR_MAX,
  GRADUATION_YEAR_MIN,
  positionOptions,
  programOptions,
  range,
} from "@/config/player-options";
import type { PlayerRow } from "@/lib/supabase/types";
import type { FormState } from "@/lib/validation/form";
import { idleState } from "@/lib/validation/form";

type Action = (prev: FormState, formData: FormData) => Promise<FormState>;

/** Form values from a saved player, keyed by form field name. */
function initialValues(player?: PlayerRow): Record<string, string> {
  if (!player) return {};
  return {
    firstName: player.first_name,
    lastName: player.last_name,
    birthYear: String(player.birth_year),
    graduationYear: String(player.graduation_year),
    ageGroup: player.age_group,
    program: player.program,
    primaryPosition: player.primary_position,
    secondaryPosition: player.secondary_position ?? "",
    experienceLevel: player.experience_level,
    teamOrSchool: player.team_or_school ?? "",
    goals: player.goals ?? "",
    strengths: player.strengths ?? "",
    improvementAreas: player.improvement_areas ?? "",
    emergencyContactName: player.emergency_contact_name ?? "",
    emergencyContactPhone: player.emergency_contact_phone ?? "",
  };
}

const years = (from: number, to: number) => range(from, to).map((y) => ({ value: y, label: String(y) }));

export function PlayerForm({
  action,
  player,
  cancelHref,
}: {
  action: Action;
  player?: PlayerRow;
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const v = state.values ?? initialValues(player);
  const e = state.fieldErrors ?? {};
  const isNew = !player;

  return (
    <form action={formAction} className="flex flex-col gap-8" noValidate>
      <FormMessage state={state} />

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">About the player</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField name="firstName" label="First name" defaultValue={v.firstName} errors={e.firstName} />
          <TextField name="lastName" label="Last name" defaultValue={v.lastName} errors={e.lastName} />
          <SelectField
            name="birthYear"
            label="Birth year"
            options={years(BIRTH_YEAR_MIN, BIRTH_YEAR_MAX).reverse()}
            defaultValue={v.birthYear}
            errors={e.birthYear}
          />
          <SelectField
            name="graduationYear"
            label="High school graduation year"
            options={years(GRADUATION_YEAR_MIN, GRADUATION_YEAR_MAX)}
            defaultValue={v.graduationYear}
            errors={e.graduationYear}
          />
          <SelectField
            name="ageGroup"
            label="Age group"
            options={ageGroupOptions}
            defaultValue={v.ageGroup}
            errors={e.ageGroup}
          />
          <TextField
            name="teamOrSchool"
            label="Current team or school"
            optional
            defaultValue={v.teamOrSchool}
            errors={e.teamOrSchool}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">Lacrosse</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            name="program"
            label="Program"
            options={programOptions}
            defaultValue={v.program}
            errors={e.program}
          />
          <SelectField
            name="experienceLevel"
            label="Experience"
            options={experienceOptions}
            defaultValue={v.experienceLevel}
            errors={e.experienceLevel}
          />
          <SelectField
            name="primaryPosition"
            label="Primary position"
            options={positionOptions}
            defaultValue={v.primaryPosition}
            errors={e.primaryPosition}
          />
          <SelectField
            name="secondaryPosition"
            label="Secondary position"
            optional
            options={positionOptions}
            defaultValue={v.secondaryPosition}
            errors={e.secondaryPosition}
          />
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">Goals and development</legend>
        <TextAreaField
          name="goals"
          label="Player goals"
          optional
          hint="What does your player want to achieve this season?"
          defaultValue={v.goals}
          errors={e.goals}
        />
        <TextAreaField
          name="strengths"
          label="Strengths"
          optional
          defaultValue={v.strengths}
          errors={e.strengths}
        />
        <TextAreaField
          name="improvementAreas"
          label="Areas to improve"
          optional
          defaultValue={v.improvementAreas}
          errors={e.improvementAreas}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 text-lg font-semibold">Emergency contact</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            name="emergencyContactName"
            label="Name"
            optional
            autoComplete="off"
            defaultValue={v.emergencyContactName}
            errors={e.emergencyContactName}
          />
          <TextField
            name="emergencyContactPhone"
            label="Phone"
            type="tel"
            optional
            autoComplete="off"
            defaultValue={v.emergencyContactPhone}
            errors={e.emergencyContactPhone}
          />
        </div>
      </fieldset>

      {isNew && (
        <CheckboxField
          name="parentalConsent"
          defaultChecked={v.parentalConsent === "on"}
          errors={e.parentalConsent}
          label={
            <>
              I am this player&apos;s parent or legal guardian, and I give{" "}
              <Link
                href={legalDocuments.parental_consent.href}
                target="_blank"
                className="font-medium text-carolina-dark underline"
              >
                parental consent
              </Link>{" "}
              for PBP to store and use this information.
            </>
          }
        />
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-navy/10 pt-6">
        <SubmitButton pendingText="Saving…">{isNew ? "Add player" : "Save changes"}</SubmitButton>
        <Link href={cancelHref} className="font-medium text-carolina-dark underline">
          Cancel
        </Link>
      </div>
    </form>
  );
}
