import { formatChange } from "@/lib/progress";
import type { RatingChange } from "@/lib/supabase/types";

function value(n: number | null) {
  return n === null ? "—" : n.toFixed(1);
}

/** Baseline vs current average (1–5) per category, with the change. */
export function ProgressComparison({
  rows,
  baselineLabel = "Baseline",
  currentLabel = "Current",
}: {
  rows: RatingChange[];
  baselineLabel?: string;
  currentLabel?: string;
}) {
  if (rows.length === 0) return <p className="text-sm text-navy/70">No ratings to compare yet.</p>;
  const hasCurrent = rows.some((r) => r.current !== null);
  return (
    // Focusable so keyboard users can scroll the table sideways on narrow screens.
    <div className="overflow-x-auto" tabIndex={0} role="group" aria-label="Ratings by category">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-navy/10 text-navy/70">
            <th scope="col" className="py-2 pr-3 font-medium">
              Category
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              {baselineLabel}
            </th>
            <th scope="col" className="px-2 py-2 text-right font-medium">
              {currentLabel}
            </th>
            <th scope="col" className="py-2 pl-2 text-right font-medium">
              Change
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category} className="border-b border-navy/5 last:border-0">
              <th scope="row" className="py-2 pr-3 font-normal">
                {r.category}
              </th>
              <td className="px-2 py-2 text-right tabular-nums">{value(r.baseline)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{value(r.current)}</td>
              <td
                className={`py-2 pl-2 text-right font-semibold tabular-nums ${
                  r.change !== null && r.change > 0
                    ? "text-carolina-dark"
                    : r.change !== null && r.change < 0
                      ? "text-orange-dark"
                      : ""
                }`}
              >
                {formatChange(r.change)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!hasCurrent && (
        <p className="mt-2 text-sm text-navy/70">Current ratings appear after a follow-up assessment.</p>
      )}
    </div>
  );
}
