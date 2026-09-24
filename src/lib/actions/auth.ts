"use server";

import { redirect } from "next/navigation";

import { legalDocuments } from "@/config/legal";
import { recordSignupConsent } from "@/lib/auth/signup-consent";
import { getSiteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import {
  emailOnlySchema,
  newPasswordSchema,
  passwordSignInSchema,
  safeNextPath,
  signUpSchema,
} from "@/lib/validation/auth";
import { formValues, validationError, type FormState } from "@/lib/validation/form";

const notConfigured: FormState = {
  status: "error",
  message: "Sign-in is not set up in this environment yet.",
};

function confirmUrl(next: string) {
  return `${getSiteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`;
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password"]);
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await createClient();
  if (!supabase) return { ...notConfigured, values };

  const { firstName, lastName, email, password } = parsed.data;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: confirmUrl("/parent"),
      // Names prefill the profile. The accepted versions are recorded as consent
      // once the account is confirmed (see /auth/confirm). Roles are never read
      // from this metadata.
      data: {
        first_name: firstName,
        last_name: lastName,
        accepted_terms_version: legalDocuments.terms_of_service.version,
        accepted_privacy_version: legalDocuments.privacy_policy.version,
      },
    },
  });

  if (error) {
    return {
      status: "error",
      message:
        error.code === "weak_password"
          ? "Choose a stronger password."
          : "We couldn't create your account. Please check your details and try again.",
      values,
    };
  }

  // With email confirmation turned off, sign-up signs the parent in immediately.
  if (data.session && data.user) {
    await recordSignupConsent(supabase, data.user);
    redirect("/parent");
  }

  redirect("/check-email?for=signup");
}

export async function signInWithPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, ["password"]);
  const parsed = passwordSignInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await createClient();
  if (!supabase) return { ...notConfigured, values };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      status: "error",
      message:
        error.code === "email_not_confirmed"
          ? "Please confirm your email address first. Check your inbox for the link we sent."
          : "That email and password don't match an account.",
      values,
    };
  }

  redirect(safeNextPath(formData.get("next")));
}

export async function sendSignInLink(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = emailOnlySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await createClient();
  if (!supabase) return { ...notConfigured, values };

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      // Links only sign in existing accounts; new families sign up so they accept the terms.
      shouldCreateUser: false,
      emailRedirectTo: confirmUrl(safeNextPath(formData.get("next"))),
    },
  });

  // Don't reveal whether an account exists: "user not found" looks the same as success.
  if (error && error.status !== 400 && error.code !== "otp_disabled" && error.code !== "user_not_found") {
    return {
      status: "error",
      message:
        error.status === 429
          ? "Too many sign-in emails were requested. Please wait a few minutes and try again."
          : "We couldn't send the sign-in link. Please try again.",
      values,
    };
  }

  redirect("/check-email?for=link");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = emailOnlySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const supabase = await createClient();
  if (!supabase) return { ...notConfigured, values };

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: confirmUrl("/reset-password"),
  });
  if (error?.status === 429) {
    return {
      status: "error",
      message: "Too many emails were requested. Please wait a few minutes and try again.",
      values,
    };
  }

  redirect("/check-email?for=reset");
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, {});

  const supabase = await createClient();
  if (!supabase) return notConfigured;

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return {
      status: "error",
      message:
        error.code === "same_password"
          ? "Choose a password you haven't used here before."
          : "Your reset link has expired. Request a new one and try again.",
    };
  }

  redirect("/parent?notice=password-updated");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/");
}
