import type { Metadata } from "next";
import Link from "next/link";

import { Notice } from "@/components/notice";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
        <p className="mt-2 text-navy/80">
          Parents, coaches, and administrators will sign in here with their email address.
        </p>
      </div>

      <Notice title="Sign-in is not available yet">
        Accounts are being built and will be switched on in an upcoming release. There is nothing to enter on
        this page for now.
      </Notice>

      <Link href="/" className="font-medium text-carolina-dark underline">
        Back to home
      </Link>
    </div>
  );
}
