import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/auth-forms";
import { AuthCard } from "@/components/layout/auth-card";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      intro="Enter your email and we'll send you a link to choose a new password."
    >
      <div className="flex flex-col gap-5">
        <ForgotPasswordForm />
        <Link href="/login" className="text-sm font-semibold text-carolina-dark underline">
          Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
