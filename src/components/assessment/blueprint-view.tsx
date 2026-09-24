import type { BlueprintDetail } from "@/lib/data/assessments";
import { formatDate } from "@/lib/time";

/** Read-only Blueprint: goals, priorities, and assigned drills with weekly targets. */
export function BlueprintView({ detail }: { detail: BlueprintDetail }) {
  const { blueprint, priorities, drills } = detail;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-navy/70">
        Started {formatDate(blueprint.start_date)}
        {blueprint.review_date && ` · review on ${formatDate(blueprint.review_date)}`}
      </p>

      {(blueprint.player_goals || blueprint.coach_summary) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {blueprint.player_goals && (
            <div className="rounded-xl border border-navy/10 bg-white p-4">
              <h3 className="text-sm font-semibold text-navy/60">Player goals</h3>
              <p className="mt-1 whitespace-pre-line">{blueprint.player_goals}</p>
            </div>
          )}
          {blueprint.coach_summary && (
            <div className="rounded-xl border border-navy/10 bg-white p-4">
              <h3 className="text-sm font-semibold text-navy/60">From the coach</h3>
              <p className="mt-1 whitespace-pre-line">{blueprint.coach_summary}</p>
            </div>
          )}
        </div>
      )}

      <section aria-label="Development priorities" className="flex flex-col gap-2">
        <h3 className="font-semibold">Development priorities</h3>
        {priorities.length === 0 ? (
          <p className="text-sm text-navy/70">No priorities set yet.</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {priorities.map((p) => (
              <li key={p.id} className="flex gap-3 rounded-xl border border-navy/10 bg-white p-4">
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-orange text-sm font-bold text-white">
                  {p.rank}
                </span>
                <div>
                  <p className="font-medium">{p.title}</p>
                  {p.description && <p className="text-sm text-navy/70">{p.description}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section aria-label="Assigned drills" className="flex flex-col gap-2">
        <h3 className="font-semibold">Drills and weekly targets</h3>
        {drills.length === 0 ? (
          <p className="text-sm text-navy/70">No drills assigned yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {drills.map((d) => (
              <li key={d.id} className="flex flex-col gap-1 rounded-xl border border-navy/10 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-medium">{d.drill?.title ?? "Drill"}</p>
                  <span className="text-sm font-semibold text-carolina-dark">
                    {[
                      d.weekly_reps_target && `${d.weekly_reps_target} reps`,
                      d.weekly_minutes_target && `${d.weekly_minutes_target} min`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No set target"}
                    {" per week"}
                  </span>
                </div>
                <p className="text-xs text-navy/60">
                  {d.is_at_home ? "At home" : "At sessions"}
                  {d.drill?.equipment && ` · ${d.drill.equipment}`}
                </p>
                {d.instructions && <p className="text-sm">{d.instructions}</p>}
                {d.drill?.description && <p className="text-sm text-navy/70">{d.drill.description}</p>}
                {d.drill?.video_url && (
                  <a
                    href={d.drill.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-carolina-dark underline"
                  >
                    Watch the demonstration
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
