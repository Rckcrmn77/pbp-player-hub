"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { CheckboxField, TextField } from "@/components/forms/fields";
import { FormMessage, SubmitButton } from "@/components/forms/form-status";
import { legalDocuments } from "@/config/legal";
import {
  requestPasswordReset,
  sendSignInLink,
  signInWithPassword,
  signUp,
  updatePassword,
} from "@/lib/actions/auth";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";
import { idleState } from "@/lib/validation/form";

export function SignInForms({ next }: { next: string }) {
  const [method, setMethod] = useState<"password" | "link">("password");

  return (
    <div className="flex flex-col gap-5">
      <div
        role="tablist"
        aria-label="Sign-in method"
        className="grid grid-cols-2 gap-1 rounded-lg bg-navy/5 p-1"
      >
        {(
          [
            ["password", "Password"],
            ["link", "Email me a link"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            id={`tab-${value}`}
            aria-selected={method === value}
            aria-controls={`panel-${value}`}
            onClick={() => setMethod(value)}
            className={`rounded-md px-3 py-2 text-sm font-semibold ${
              method === value ? "bg-white text-navy shadow-sm" : "text-navy/70 hover:text-navy"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${method}`} aria-labelledby={`tab-${method}`}>
        {method === "password" ? <PasswordSignInForm next={next} /> : <SignInLinkForm next={next} />}
      </div>
    </div>
  );
}

function PasswordSignInForm({ next }: { next: string }) {
  const [state, action] = useActionState(signInWithPassword, idleState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <TextField
        name="password"
        label="Password"
        type="password"
        autoComplete="current-password"
        errors={state.fieldErrors?.password}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
        <Link href="/forgot-password" className="text-sm font-medium text-carolina-dark underline">
          Forgot your password?
        </Link>
      </div>
    </form>
  );
}

function SignInLinkForm({ next }: { next: string }) {
  const [state, action] = useActionState(sendSignInLink, idleState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        hint="We'll email you a link that signs you in. No password needed."
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <div>
        <SubmitButton pendingText="Sending…">Email me a sign-in link</SubmitButton>
      </div>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUp, idleState);
  const terms = legalDocuments.terms_of_service;
  const privacy = legalDocuments.privacy_policy;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          name="firstName"
          label="First name"
          autoComplete="given-name"
          defaultValue={state.values?.firstName}
          errors={state.fieldErrors?.firstName}
        />
        <TextField
          name="lastName"
          label="Last name"
          autoComplete="family-name"
          defaultValue={state.values?.lastName}
          errors={state.fieldErrors?.lastName}
        />
      </div>
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <TextField
        name="password"
        label="Password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters. You can also sign in later with an emailed link.`}
        errors={state.fieldErrors?.password}
      />
      <CheckboxField
        name="acceptTerms"
        defaultChecked={state.values?.acceptTerms === "on"}
        errors={state.fieldErrors?.acceptTerms}
        label={
          <>
            I am a parent or legal guardian, and I accept the{" "}
            <Link href={terms.href} target="_blank" className="font-medium text-carolina-dark underline">
              {terms.title}
            </Link>{" "}
            and{" "}
            <Link href={privacy.href} target="_blank" className="font-medium text-carolina-dark underline">
              {privacy.title}
            </Link>
            .
          </>
        }
      />
      <div>
        <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
      </div>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, idleState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <TextField
        name="email"
        label="Email"
        type="email"
        autoComplete="email"
        defaultValue={state.values?.email}
        errors={state.fieldErrors?.email}
      />
      <div>
        <SubmitButton pendingText="Sending…">Email me a reset link</SubmitButton>
      </div>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, idleState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <TextField
        name="password"
        label="New password"
        type="password"
        autoComplete="new-password"
        minLength={PASSWORD_MIN_LENGTH}
        hint={`At least ${PASSWORD_MIN_LENGTH} characters.`}
        errors={state.fieldErrors?.password}
      />
      <TextField
        name="confirmPassword"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        errors={state.fieldErrors?.confirmPassword}
      />
      <div>
        <SubmitButton pendingText="Saving…">Save new password</SubmitButton>
      </div>
    </form>
  );
}
