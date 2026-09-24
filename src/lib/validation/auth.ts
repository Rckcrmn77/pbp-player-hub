import { z } from "zod";

export const PASSWORD_MIN_LENGTH = 10;

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(72, "Use 72 characters or fewer.");

const name = (label: string) =>
  z.string().trim().min(1, `Enter your ${label}.`).max(100, `Keep your ${label} under 100 characters.`);

export const signUpSchema = z.object({
  firstName: name("first name"),
  lastName: name("last name"),
  email,
  password,
  acceptTerms: z.literal("on", { error: "You need to accept the Terms of Service and Privacy Policy." }),
});

export const passwordSignInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

export const emailOnlySchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    message: "The passwords do not match.",
    path: ["confirmPassword"],
  });

/** Only allow redirects to paths inside this site. */
export function safeNextPath(next: unknown, fallback = "/parent"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  return next;
}
