import type { AssessmentCriterionRow, AssessmentScoreRow } from "@/lib/supabase/types";

export type CategoryResult = { category: string; average: number | null; rated: number };

/**
 * Average rating per category, in the order the template lists them.
 * Only active criteria count; unrated criteria are ignored.
 */
export function categoryAverages(
  criteria: Pick<AssessmentCriterionRow, "id" | "category" | "sort_order" | "is_active">[],
  scores: Pick<AssessmentScoreRow, "criterion_id" | "rating">[],
): CategoryResult[] {
  const ratingByCriterion = new Map(scores.map((s) => [s.criterion_id, s.rating]));
  const order: string[] = [];
  const totals = new Map<string, { sum: number; rated: number }>();
  for (const c of [...criteria].filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order)) {
    if (!totals.has(c.category)) {
      order.push(c.category);
      totals.set(c.category, { sum: 0, rated: 0 });
    }
    const rating = ratingByCriterion.get(c.id);
    if (rating !== undefined) {
      const t = totals.get(c.category)!;
      t.sum += rating;
      t.rated += 1;
    }
  }
  return order.map((category) => {
    const { sum, rated } = totals.get(category)!;
    return { category, average: rated === 0 ? null : Math.round((sum / rated) * 10) / 10, rated };
  });
}

/** Criteria that still need a rating and a comment before an assessment can be submitted. */
export function missingForSubmission(
  criteria: Pick<AssessmentCriterionRow, "id" | "is_active">[],
  scores: Pick<AssessmentScoreRow, "criterion_id" | "comment">[],
): string[] {
  const complete = new Set(scores.filter((s) => s.comment.trim() !== "").map((s) => s.criterion_id));
  return criteria.filter((c) => c.is_active && !complete.has(c.id)).map((c) => c.id);
}
