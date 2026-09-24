import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/layout/auth-card";

export const metadata: Metadata = { title: "Check your email" };

const messages: Record<string, string> = {
  signup: "We sent you a link to confirm your email address. Open it to finish creating your account.",
  link: "If an account exists for that address, we sent it a sign-in link. It works once and expires after an hour.",
  reset: "If an account exists for that address, we sent it a link to choose a new password.",
};

export default async function CheckEmailPage({ searchParams }: PageProps<"/check-email">) {
  const { for: reason } = await searchParams;
  const message = messages[typeof reason === "string" ? reason : ""] ?? messages.link;

  return (
    <AuthCard title="Check your email" intro={message}>
      <div className="flex flex-col gap-3 text-sm text-navy/80">
        <p>Didn&apos;t get it? Check your spam folder, or wait a minute and try again.</p>
        <Link href="/login" className="font-semibold text-carolina-dark underline">
          Back to sign in
        </Link>
      </div>
    </AuthCard>
  );
}
