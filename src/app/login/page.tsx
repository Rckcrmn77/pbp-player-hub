import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignInForms } from "@/components/auth/auth-forms";
import { AuthCard } from "@/components/layout/auth-card";
import { Notice } from "@/components/notice";
import { getSessionUser, homePathFor } from "@/lib/auth/session";
import { getSupabaseConfig } from "@/lib/env";
import { safeNextPath } from "@/lib/validation/auth";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(params.next, "");
  const user = await getSessionUser();
  if (user) redirect(next || homePathFor(user.profile.role));

  return (
    <AuthCard title="Sign in" intro="Parents, coaches, and staff sign in with their email address.">
      <div className="flex flex-col gap-5">
        {params.error === "link" && (
          <p role="alert" className="rounded-md bg-orange/10 p-3 text-sm font-medium text-orange-dark">
            That link has expired or was already used. Request a new one below.
          </p>
        )}
        {!getSupabaseConfig() && (
          <Notice title="Sign-in is not set up here">
            This copy of the app is not connected to a database yet, so sign-in will not work.
          </Notice>
        )}
        <SignInForms next={next} />
        <p className="border-t border-navy/10 pt-4 text-sm text-navy/80">
          New to the Player Hub?{" "}
          <Link href="/signup" className="font-semibold text-carolina-dark underline">
            Create a parent account
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
