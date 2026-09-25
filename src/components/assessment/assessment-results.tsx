import { ratingScale } from "@/config/assessment";
import { categoryAverages } from "@/lib/assessment-summary";
import type { AssessmentDetail } from "@/lib/data/assessments";

function RatingBar({ value }: { value: number | null }) {
  const pct = value === null ? 0 : (value / 5) * 100;
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-navy/10" aria-hidden="true">
        <div className="h-full rounded-full bg-carolina-dark" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-10 text-sm font-semibold tabular-nums">
        {value === null ? "—" : value.toFixed(1)}
      </span>
    </div>
  );
}

/** Read-only results: category averages, then every criterion's rating and comment. */
export function AssessmentResults({ detail }: { detail: AssessmentDetail }) {
  const { criteria, scores, assessment } = detail;
  const byCriterion = new Map(scores.map((s) => [s.criterion_id, s]));
  const categories = categoryAverages(criteria, scores);
  const active = criteria.filter((c) => c.is_active);

  return (
    <div className="flex flex-col gap-5">
      <section aria-label="Category averages" className="rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="mb-3 font-semibold">By category (1–5)</h2>
        <dl className="flex flex-col gap-2">
          {categories.map((c) => (
            <div
              key={c.category}
              className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between"
            >
              <dt className="text-sm">{c.category}</dt>
              <dd>
                <RatingBar value={c.average} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {assessment.summary && (
        <section className="rounded-xl border border-navy/10 bg-white p-5">
          <h2 className="mb-2 font-semibold">Coach summary</h2>
          <p className="whitespace-pre-line">{assessment.summary}</p>
        </section>
      )}

      <section aria-label="Ratings and comments" className="rounded-xl border border-navy/10 bg-white p-5">
        <h2 className="mb-3 font-semibold">Ratings and comments</h2>
        <ul className="divide-y divide-navy/10">
          {active.map((c) => {
            const score = byCriterion.get(c.id);
            return (
              <li key={c.id} className="flex flex-col gap-1 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-navy/70">{c.category}</p>
                  </div>
                  <span className="rounded-md bg-carolina-light px-2 py-1 text-sm font-semibold whitespace-nowrap">
                    {score ? ratingScale.find((r) => r.value === score.rating)?.label : "Not rated"}
                  </span>
                </div>
                {score?.comment && <p className="text-sm text-navy/80">{score.comment}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
