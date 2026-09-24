"use client";

import { useActionState } from "react";

import { TextField } from "@/components/forms/fields";
import { FormMessage, SubmitButton } from "@/components/forms/form-status";
import { updateProfile } from "@/lib/actions/parent";
import { idleState } from "@/lib/validation/form";

export function ProfileForm({
  initial,
}: {
  initial: { firstName: string; lastName: string; phone: string };
}) {
  const [state, action] = useActionState(updateProfile, idleState);
  const v = state.values ?? initial;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="firstName"
          label="First name"
          autoComplete="given-name"
          defaultValue={v.firstName}
          errors={state.fieldErrors?.firstName}
        />
        <TextField
          name="lastName"
          label="Last name"
          autoComplete="family-name"
          defaultValue={v.lastName}
          errors={state.fieldErrors?.lastName}
        />
      </div>
      <TextField
        name="phone"
        label="Phone"
        type="tel"
        optional
        autoComplete="tel"
        defaultValue={v.phone}
        errors={state.fieldErrors?.phone}
      />
      <div>
        <SubmitButton pendingText="Saving…">Save details</SubmitButton>
      </div>
    </form>
  );
}
