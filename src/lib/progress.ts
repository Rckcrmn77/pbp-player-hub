import type { CategoryResult } from "@/lib/assessment-summary";
import type {
  AttendanceSnapshot,
  AttendanceStatus,
  RatingChange,
  WeeklyCheckinRow,
  WorkSnapshot,
} from "@/lib/supabase/types";
import { addDays, weekStart } from "@/lib/time";

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Baseline and current category averages side by side. Categories keep the
 * baseline's order; categories only in the current assessment come last.
 */
export function compareCategories(
  baseline: CategoryResult[],
  current: CategoryResult[] | null,
): RatingChange[] {
  const currentBy = new Map((current ?? []).map((c) => [c.category, c.average]));
  const rows: RatingChange[] = baseline.map((b) => {
    const now = currentBy.get(b.category) ?? null;
    return {
      category: b.category,
      baseline: b.average,
      current: now,
      change: b.average !== null && now !== null ? round1(now - b.average) : null,
    };
  });
  const seen = new Set(baseline.map((b) => b.category));
  for (const c of current ?? []) {
    if (!seen.has(c.category))
      rows.push({ category: c.category, baseline: null, current: c.average, change: null });
  }
  return rows;
}

export function summarizeAttendance(statuses: AttendanceStatus[]): AttendanceSnapshot {
  const summary: AttendanceSnapshot = { present: 0, absent: 0, excused: 0, makeup: 0, total: 0 };
  for (const s of statuses) {
    summary[s] += 1;
    summary.total += 1;
  }
  return summary;
}

/** Number of Monday-to-Sunday weeks touched by a date range (at least 1). */
export function weeksInRange(startDate: string, endDate: string): number {
  const first = weekStart(startDate);
  const last = weekStart(endDate < startDate ? startDate : endDate);
  let weeks = 1;
  for (let w = first; w < last; w = addDays(w, 7)) weeks += 1;
  return weeks;
}

export function summarizeWork(
  checkins: Pick<
    WeeklyCheckinRow,
    "assignment_completed" | "reps_completed" | "minutes_completed" | "confidence"
  >[],
  startDate: string,
  endDate: string,
): WorkSnapshot {
  const confidence = checkins.map((c) => c.confidence);
  return {
    weeksInPlan: weeksInRange(startDate, endDate),
    checkIns: checkins.length,
    weeksCompleted: checkins.filter((c) => c.assignment_completed).length,
    totalReps: checkins.reduce((sum, c) => sum + (c.reps_completed ?? 0), 0),
    totalMinutes: checkins.reduce((sum, c) => sum + (c.minutes_completed ?? 0), 0),
    averageConfidence: confidence.length
      ? round1(confidence.reduce((a, b) => a + b, 0) / confidence.length)
      : null,
  };
}

/** The weeks a family may check in for: this week and last week, never before the Blueprint's first week. */
export function checkinWeeks(blueprintStart: string, today: string): string[] {
  const thisWeek = weekStart(today);
  const first = weekStart(blueprintStart);
  return [thisWeek, addDays(thisWeek, -7)].filter((w) => w >= first);
}

export function isAttendanceSnapshot(value: unknown): value is AttendanceSnapshot {
  return typeof value === "object" && value !== null && "total" in value;
}

export function isWorkSnapshot(value: unknown): value is WorkSnapshot {
  return typeof value === "object" && value !== null && "checkIns" in value;
}

/** "+0.5", "−1.0", "0.0" */
export function formatChange(change: number | null): string {
  if (change === null) return "—";
  if (change > 0) return `+${change.toFixed(1)}`;
  if (change < 0) return `−${Math.abs(change).toFixed(1)}`;
  return "0.0";
}
