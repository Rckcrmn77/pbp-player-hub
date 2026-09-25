import { confidenceLabel } from "@/config/progress";
import type { WeeklyCheckinRow } from "@/lib/supabase/types";
import { formatWeek } from "@/lib/time";

/** Weekly check-ins, newest first. */
export function CheckinList({ checkins, empty }: { checkins: WeeklyCheckinRow[]; empty: string }) {
  if (checkins.length === 0) return <p className="text-sm text-navy/70">{empty}</p>;
  return (
    <ul className="divide-y divide-navy/10 rounded-xl border border-navy/10 bg-white">
      {checkins.map((c) => {
        const work = [
          c.reps_completed !== null && `${c.reps_completed} reps`,
          c.minutes_completed !== null && `${c.minutes_completed} min`,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={c.id} className="flex flex-col gap-1 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-medium">{formatWeek(c.week_start)}</p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  c.assignment_completed ? "bg-carolina-light" : "bg-orange/10 text-orange-dark"
                }`}
              >
                {c.assignment_completed ? "Assignment done" : "Assignment not done"}
              </span>
            </div>
            <p className="text-sm text-navy/70">
              {work && `${work} · `}Confidence {c.confidence}/5 ({confidenceLabel(c.confidence)})
            </p>
            {c.reflection && <p className="text-sm">{c.reflection}</p>}
            {c.question_for_coach && (
              <p className="text-sm">
                <span className="font-semibold">Question for the coach:</span> {c.question_for_coach}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
