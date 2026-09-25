import "server-only";

import { cache } from "react";

import { categoryAverages } from "@/lib/assessment-summary";
import { getAssessmentDetail, listPlayerAssessments, type AssessmentDetail } from "@/lib/data/assessments";
import { compareCategories } from "@/lib/progress";
import { createClient, type ServerClient } from "@/lib/supabase/server";
import type {
  AssessmentRow,
  ProgramRow,
  ProgressReportRow,
  RatingChange,
  ReviewStatus,
  WeeklyCheckinRow,
} from "@/lib/supabase/types";

/**
 * Reads for weekly check-ins, progress comparison and progress reports. Every
 * query runs as the signed-in user; Row Level Security decides what comes back
 * (families see their own check-ins and only published reports).
 */

async function client(): Promise<ServerClient> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

// ---------------------------------------------------------------------------
// Check-ins
// ---------------------------------------------------------------------------

export const listCheckins = cache(async (playerId: string): Promise<WeeklyCheckinRow[]> => {
  const supabase = await client();
  const { data, error } = await supabase
    .from("weekly_checkins")
    .select("*")
    .eq("player_id", playerId)
    .order("week_start", { ascending: false });
  if (error) throw new Error("Could not load check-ins.");
  return data ?? [];
});

export type CheckinStatus = { playerId: string; blueprintId: string; thisWeekDone: boolean };

/** For each active Blueprint the user can see: has this week's check-in been submitted? */
export async function checkinStatuses(thisWeek: string): Promise<CheckinStatus[]> {
  const supabase = await client();
  const { data: blueprints } = await supabase
    .from("blueprints")
    .select("id, player_id")
    .eq("status", "active");
  if (!blueprints?.length) return [];
  const { data: done } = await supabase
    .from("weekly_checkins")
    .select("blueprint_id")
    .eq("week_start", thisWeek)
    .in(
      "blueprint_id",
      blueprints.map((b) => b.id),
    );
  const submitted = new Set((done ?? []).map((c) => c.blueprint_id));
  return blueprints.map((b) => ({
    playerId: b.player_id,
    blueprintId: b.id,
    thisWeekDone: submitted.has(b.id),
  }));
}

/**
 * Of the given players, those with an active Blueprint that started on or
 * before `week` and no check-in for that week.
 */
export async function playersMissingCheckin(playerIds: string[], week: string): Promise<Set<string>> {
  if (playerIds.length === 0) return new Set();
  const supabase = await client();
  const { data: blueprints } = await supabase
    .from("blueprints")
    .select("id, player_id, start_date")
    .eq("status", "active")
    .in("player_id", playerIds);
  const due = (blueprints ?? []).filter((b) => b.start_date <= week);
  if (due.length === 0) return new Set();
  const { data: done } = await supabase
    .from("weekly_checkins")
    .select("blueprint_id")
    .eq("week_start", week)
    .in(
      "blueprint_id",
      due.map((b) => b.id),
    );
  const submitted = new Set((done ?? []).map((c) => c.blueprint_id));
  return new Set(due.filter((b) => !submitted.has(b.id)).map((b) => b.player_id));
}

/** Recent check-ins with a question for the coach, newest first. */
export async function recentQuestions(playerIds: string[], sinceWeek: string): Promise<WeeklyCheckinRow[]> {
  if (playerIds.length === 0) return [];
  const supabase = await client();
  const { data } = await supabase
    .from("weekly_checkins")
    .select("*")
    .in("player_id", playerIds)
    .gte("week_start", sinceWeek)
    .not("question_for_coach", "is", null)
    .order("week_start", { ascending: false })
    .limit(10);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Progress comparison
// ---------------------------------------------------------------------------

export type ProgressComparison = {
  baseline: AssessmentRow;
  current: AssessmentRow | null;
  rows: RatingChange[];
};

/** Finished (non-draft) assessments the user can see; families only see published ones. */
function finished(assessments: AssessmentRow[]) {
  return assessments.filter((a) => a.status !== "draft");
}

/**
 * The player's first finished baseline against their latest finished
 * follow-up. `onlyPublished` limits it to published assessments (what a
 * family could already see).
 */
export async function getProgressComparison(
  playerId: string,
  { onlyPublished = false, baselineId }: { onlyPublished?: boolean; baselineId?: string | null } = {},
): Promise<ProgressComparison | null> {
  const all = finished(await listPlayerAssessments(playerId)).filter(
    (a) => !onlyPublished || a.status === "published",
  );
  // listPlayerAssessments is newest first.
  const baselines = all.filter((a) => a.assessment_type === "baseline");
  const baseline = all.find((a) => a.id === baselineId) ?? baselines[baselines.length - 1];
  if (!baseline) return null;
  const current =
    all.find(
      (a) =>
        a.assessment_type === "follow_up" &&
        (a.assessed_on > baseline.assessed_on ||
          (a.assessed_on === baseline.assessed_on && a.created_at > baseline.created_at)),
    ) ?? null;
  const [baseDetail, currentDetail] = await Promise.all([
    getAssessmentDetail(baseline.id),
    current ? getAssessmentDetail(current.id) : Promise.resolve(null),
  ]);
  if (!baseDetail) return null;
  const averages = (d: AssessmentDetail) => categoryAverages(d.criteria, d.scores);
  return {
    baseline,
    current,
    rows: compareCategories(averages(baseDetail), currentDetail ? averages(currentDetail) : null),
  };
}

// ---------------------------------------------------------------------------
// Progress reports
// ---------------------------------------------------------------------------

export const listPlayerReports = cache(async (playerId: string): Promise<ProgressReportRow[]> => {
  const supabase = await client();
  const { data, error } = await supabase
    .from("progress_reports")
    .select("*")
    .eq("player_id", playerId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load progress reports.");
  return data ?? [];
});

export type ReportDetail = {
  report: ProgressReportRow;
  playerName: string;
  program: Pick<ProgramRow, "id" | "name" | "start_date" | "end_date"> | null;
  recommendedProgram: Pick<ProgramRow, "id" | "name" | "registration_url"> | null;
  authorName: string;
  baselineDate: string | null;
  currentDate: string | null;
};

export const getReportDetail = cache(async (id: string): Promise<ReportDetail | null> => {
  const supabase = await client();
  const { data: report } = await supabase.from("progress_reports").select("*").eq("id", id).maybeSingle();
  if (!report) return null;
  const programIds = [report.program_id, report.recommended_program_id].filter((v): v is string => !!v);
  const assessmentIds = [report.baseline_assessment_id, report.current_assessment_id].filter(
    (v): v is string => !!v,
  );
  const [player, programs, author, assessments] = await Promise.all([
    supabase.from("players").select("first_name, last_name").eq("id", report.player_id).maybeSingle(),
    programIds.length
      ? supabase
          .from("programs")
          .select("id, name, start_date, end_date, registration_url")
          .in("id", programIds)
      : Promise.resolve({ data: [] }),
    supabase.from("profiles").select("first_name, last_name").eq("id", report.author_id).maybeSingle(),
    assessmentIds.length
      ? supabase.from("assessments").select("id, assessed_on").in("id", assessmentIds)
      : Promise.resolve({ data: [] }),
  ]);
  const programById = new Map((programs.data ?? []).map((p) => [p.id, p]));
  const dateOf = (aid: string | null) =>
    (assessments.data ?? []).find((a) => a.id === aid)?.assessed_on ?? null;
  const program = report.program_id ? programById.get(report.program_id) : undefined;
  const recommended = report.recommended_program_id
    ? programById.get(report.recommended_program_id)
    : undefined;
  return {
    report,
    playerName: player.data ? `${player.data.first_name} ${player.data.last_name}` : "Player",
    program: program
      ? { id: program.id, name: program.name, start_date: program.start_date, end_date: program.end_date }
      : null,
    recommendedProgram: recommended
      ? { id: recommended.id, name: recommended.name, registration_url: recommended.registration_url }
      : null,
    authorName: author.data ? `${author.data.first_name} ${author.data.last_name}`.trim() : "PBP coach",
    baselineDate: dateOf(report.baseline_assessment_id),
    currentDate: dateOf(report.current_assessment_id),
  };
});

export type ReportQueueItem = ProgressReportRow & { playerName: string };

/** Reports in the given statuses that the user can see (for approval and publishing queues). */
export const listReportQueue = cache(async (statuses: ReviewStatus[]): Promise<ReportQueueItem[]> => {
  const supabase = await client();
  const { data: reports, error } = await supabase
    .from("progress_reports")
    .select("*")
    .in("status", statuses)
    .order("submitted_at");
  if (error) throw new Error("Could not load reports.");
  if (!reports?.length) return [];
  const { data: players } = await supabase
    .from("players")
    .select("id, first_name, last_name")
    .in(
      "id",
      reports.map((r) => r.player_id),
    );
  const names = new Map((players ?? []).map((p) => [p.id, `${p.first_name} ${p.last_name}`]));
  return reports.map((r) => ({ ...r, playerName: names.get(r.player_id) ?? "Player" }));
});

/** Latest published report per player, for the parent dashboard. */
export async function latestPublishedReports(): Promise<Map<string, ProgressReportRow>> {
  const supabase = await client();
  const { data } = await supabase
    .from("progress_reports")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });
  const latest = new Map<string, ProgressReportRow>();
  for (const r of data ?? []) if (!latest.has(r.player_id)) latest.set(r.player_id, r);
  return latest;
}
