import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import type { SessionWithProgram } from "@/lib/data/staff";
import { formatSessionTime } from "@/lib/time";

export type SessionListItem = SessionWithProgram & { marked: number; rosterSize: number };

export function SessionList({ sessions, empty }: { sessions: SessionListItem[]; empty: string }) {
  if (sessions.length === 0) return <p className="text-sm text-navy/70">{empty}</p>;
  return (
    <ul className="divide-y divide-navy/10 rounded-xl border border-navy/10 bg-white">
      {sessions.map((s) => {
        const complete = s.rosterSize > 0 && s.marked >= s.rosterSize;
        return (
          <li key={s.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={`font-medium ${s.status === "cancelled" ? "text-navy/50 line-through" : ""}`}>
                {formatSessionTime(s.starts_at, s.ends_at)}
              </p>
              <p className="text-sm text-navy/60">{s.programName}</p>
            </div>
            <div className="flex items-center gap-3">
              {s.status === "cancelled" ? (
                <StatusPill tone="warn">Cancelled</StatusPill>
              ) : (
                <>
                  <StatusPill tone={complete ? "good" : "neutral"}>
                    {s.marked}/{s.rosterSize} marked
                  </StatusPill>
                  <Link
                    href={`/coach/sessions/${s.id}`}
                    className="rounded-md bg-orange px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-dark"
                  >
                    {s.marked > 0 ? "Update attendance" : "Take attendance"}
                  </Link>
                </>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
