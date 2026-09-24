import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignUpForm } from "@/components/auth/auth-forms";
import { AuthCard } from "@/components/layout/auth-card";
import { getSessionUser, homePathFor } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create a parent account" };

export default async function SignUpPage() {
  const user = await getSessionUser();
  if (user) redirect(homePathFor(user.profile.role));

  return (
    <AuthCard
      title="Create a parent account"
      intro="Parents and guardians manage the account and add their players. Players do not need their own account."
    >
      <div className="flex flex-col gap-5">
        <SignUpForm />
        <p className="border-t border-navy/10 pt-4 text-sm text-navy/80">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-carolina-dark underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
