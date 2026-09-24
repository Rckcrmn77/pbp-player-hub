import type { ReactNode } from "react";

/** Narrow, centred layout shared by the sign-in and account pages. */
export function AuthCard({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {intro && <p className="mt-2 text-navy/80">{intro}</p>}
      </div>
      <div className="rounded-xl border border-navy/10 bg-white p-5 sm:p-6">{children}</div>
    </div>
  );
}
