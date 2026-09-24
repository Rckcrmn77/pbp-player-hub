import type { ReactNode } from "react";

/** A clearly labelled callout for work-in-progress or informational messages. */
export function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="note" className="rounded-lg border-l-4 border-carolina bg-carolina-light p-4">
      <p className="font-semibold">{title}</p>
      <div className="mt-1 text-sm text-navy/80">{children}</div>
    </div>
  );
}
