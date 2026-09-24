import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/auth/auth-forms";
import { AuthCard } from "@/components/layout/auth-card";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  // The reset link signs the user in first (see /auth/confirm).
  await requireUser("/reset-password");
  return (
    <AuthCard title="Choose a new password">
      <ResetPasswordForm />
    </AuthCard>
  );
}
