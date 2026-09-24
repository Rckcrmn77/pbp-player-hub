import type { Metadata } from "next";
import Link from "next/link";

import { ProfileForm } from "@/components/parent/profile-form";
import { requireRole } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireRole(["parent"], "/parent/account");
  const { profile } = user;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Account</h1>

      <section
        aria-labelledby="details-heading"
        className="flex flex-col gap-4 rounded-xl border border-navy/10 bg-white p-5"
      >
        <h2 id="details-heading" className="text-lg font-semibold">
          Your details
        </h2>
        <ProfileForm
          initial={{ firstName: profile.first_name, lastName: profile.last_name, phone: profile.phone ?? "" }}
        />
      </section>

      <section
        aria-labelledby="signin-heading"
        className="flex flex-col gap-2 rounded-xl border border-navy/10 bg-white p-5"
      >
        <h2 id="signin-heading" className="text-lg font-semibold">
          Sign-in
        </h2>
        <p className="text-sm text-navy/80">
          Email: <span className="font-medium text-navy">{user.email}</span>
        </p>
        <p className="text-sm text-navy/80">
          You can sign in with your password or with an emailed link.{" "}
          <Link href="/forgot-password" className="font-medium text-carolina-dark underline">
            Change your password
          </Link>
        </p>
      </section>

      <section
        aria-labelledby="delete-heading"
        className="flex flex-col gap-2 rounded-xl border border-navy/10 bg-white p-5"
      >
        <h2 id="delete-heading" className="text-lg font-semibold">
          Delete your account
        </h2>
        <p className="text-sm text-navy/80">
          To close your account and delete your family&apos;s information, contact PBP staff. [Placeholder: a
          contact address and an in-app request are still to be decided.]
        </p>
      </section>
    </div>
  );
}
