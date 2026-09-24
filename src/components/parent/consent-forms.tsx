"use client";

import Link from "next/link";
import { useActionState } from "react";

import { CheckboxField } from "@/components/forms/fields";
import { FormMessage, SubmitButton } from "@/components/forms/form-status";
import { accountConsentTypes, legalDocuments } from "@/config/legal";
import { acceptAccountAgreements } from "@/lib/actions/parent";
import { idleState } from "@/lib/validation/form";

export function AcceptAgreementsForm() {
  const [state, action] = useActionState(acceptAccountAgreements, idleState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      {accountConsentTypes.map((type) => {
        const doc = legalDocuments[type];
        return (
          <CheckboxField
            key={type}
            name={type}
            errors={state.fieldErrors?.[type]}
            label={
              <>
                I accept the{" "}
                <Link href={doc.href} target="_blank" className="font-medium text-carolina-dark underline">
                  {doc.title}
                </Link>{" "}
                (version {doc.version}).
              </>
            }
          />
        );
      })}
      <div>
        <SubmitButton pendingText="Saving…">Accept and continue</SubmitButton>
      </div>
    </form>
  );
}
