"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { getProgressComparison } from "@/lib/data/progress";
import { checkinWeeks, summarizeAttendance, summarizeWork } from "@/lib/progress";
import { createClient, type ServerClient } from "@/lib/supabase/server";
import type { AttendanceStatus, BlueprintRow, ProgressReportRow } from "@/lib/supabase/types";
import { dateKey } from "@/lib/time";
import { formValues, validationError, type FormState } from "@/lib/validation/form";
import { checkinSchema, reportSchema } from "@/lib/validation/progress";

/**
 * Weekly check-ins (families) and progress reports (coaches and admins).
 * Row Level Security and database triggers enforce who may write what; these
 * actions add friendly messages and compute report figures.
 */

const saveFailed = "We couldn't save that. Please try again.";
const uuid = z.uuid();

async function signedInClient(roles: ("parent" | "coach" | "admin")[], next: string) {
  const user = await requireRole(roles, next);
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  return { user, supabase };
}

// ---------------------------------------------------------------------------
// Weekly check-ins
// ---------------------------------------------------------------------------

export async function saveCheckin(
  playerId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(playerId).success) return { status: "error", message: saveFailed, values };
  const parsed = checkinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);
  const input = parsed.data;

  const { user, supabase } = await signedInClient(["parent"], `/parent/players/${playerId}/check-in`);
  const { data: blueprint } = await supabase
    .from("blueprints")
    .select("id, start_date")
    .eq("player_id", playerId)
    .eq("status", "active")
    .maybeSingle();
  if (!blueprint) {
    return { status: "error", message: "Check-ins open once the coach makes a Blueprint active.", values };
  }
  if (!checkinWeeks(blueprint.start_date, dateKey(new Date())).includes(input.weekStart)) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: { weekStart: ["Check in for this week or last week."] },
      values,
    };
  }

  const columns = {
    assignment_completed: input.assignmentCompleted,
    reps_completed: input.repsCompleted,
    minutes_completed: input.minutesCompleted,
    confidence: input.confidence,
    reflection: input.reflection,
    question_for_coach: input.questionForCoach,
  };
  const { data: existing } = await supabase
    .from("weekly_checkins")
    .select("id, submitted_by")
    .eq("blueprint_id", blueprint.id)
    .eq("week_start", input.weekStart)
    .maybeSingle();
  if (existing && existing.submitted_by !== user.id) {
    return {
      status: "error",
      message: "Another guardian already checked in for this week. They can update it.",
      values,
    };
  }
  const { error } = existing
    ? await supabase.from("weekly_checkins").update(columns).eq("id", existing.id)
    : await supabase
        .from("weekly_checkins")
        .insert({ ...columns, blueprint_id: blueprint.id, player_id: playerId, week_start: input.weekStart });
  if (error) {
    return {
      status: "error",
      message:
        error.code === "23505"
          ? "This week already has a check-in. Refresh the page to edit it."
          : saveFailed,
      values,
    };
  }

  revalidatePath("/parent", "layout");
  revalidatePath("/coach", "layout");
  redirect(`/parent/players/${playerId}?notice=checkin-saved`);
}

// ---------------------------------------------------------------------------
// Progress reports
// ---------------------------------------------------------------------------

function refresh(...paths: string[]) {
  for (const path of paths) revalidatePath(path);
  revalidatePath("/coach", "layout");
  revalidatePath("/admin/reports");
  revalidatePath("/parent", "layout");
}

/**
 * Figures a report snapshots: rating changes (baseline vs latest follow-up),
 * attendance in the report's program, and check-in totals for the Blueprint.
 */
async function reportFigures(
  supabase: ServerClient,
  playerId: string,
  blueprint: Pick<BlueprintRow, "id" | "start_date" | "baseline_assessment_id"> | null,
  programId: string | null,
) {
  const comparison = await getProgressComparison(playerId, { baselineId: blueprint?.baseline_assessment_id });

  // Attendance in the report's program (all of the player's attendance when there is no program).
  let attendance: { status: AttendanceStatus }[] = [];
  const sessions = programId
    ? ((await supabase.from("program_sessions").select("id").eq("program_id", programId)).data ?? [])
    : null;
  if (sessions === null || sessions.length > 0) {
    let query = supabase.from("attendance").select("status").eq("player_id", playerId);
    if (sessions)
      query = query.in(
        "session_id",
        sessions.map((s) => s.id),
      );
    attendance = (await query).data ?? [];
  }

  const { data: checkins } = blueprint
    ? await supabase.from("weekly_checkins").select("*").eq("blueprint_id", blueprint.id)
    : { data: [] };
  const today = dateKey(new Date());

  return {
    baseline_assessment_id: comparison?.baseline.id ?? null,
    current_assessment_id: comparison?.current?.id ?? null,
    rating_changes: comparison?.rows ?? [],
    attendance_summary: summarizeAttendance(attendance.map((a) => a.status)),
    work_summary: summarizeWork(checkins ?? [], blueprint?.start_date ?? today, today),
  } satisfies Partial<ProgressReportRow>;
}

const playerForm = z.object({ playerId: z.uuid() });

export async function startReport(formData: FormData): Promise<void> {
  const parsed = playerForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/coach?notice=error");
  const { playerId } = parsed.data;
  const { supabase } = await signedInClient(["coach", "admin"], `/coach/players/${playerId}`);

  const { data: blueprints } = await supabase
    .from("blueprints")
    .select("id, status, start_date, program_id, baseline_assessment_id")
    .eq("player_id", playerId)
    .neq("status", "draft")
    .order("start_date", { ascending: false });
  const blueprint = blueprints?.find((b) => b.status === "active") ?? blueprints?.[0] ?? null;
  let programId = blueprint?.program_id ?? null;
  if (!programId) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("program_id")
      .eq("player_id", playerId)
      .neq("status", "withdrawn")
      .limit(1)
      .maybeSingle();
    programId = enrollment?.program_id ?? null;
  }

  const id = crypto.randomUUID();
  const { error } = await supabase.from("progress_reports").insert({
    id,
    player_id: playerId,
    blueprint_id: blueprint?.id ?? null,
    program_id: programId,
    ...(await reportFigures(supabase, playerId, blueprint, programId)),
  });
  if (error) redirect(`/coach/players/${playerId}?notice=error`);

  refresh(`/coach/players/${playerId}`);
  redirect(`/coach/reports/${id}?notice=report-created`);
}

const reportForm = z.object({ reportId: z.uuid() });

/** Recomputes a draft's figures (for example after a follow-up assessment is approved). */
export async function refreshReportFigures(formData: FormData): Promise<void> {
  const parsed = reportForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/coach?notice=error");
  const path = `/coach/reports/${parsed.data.reportId}`;
  const { supabase } = await signedInClient(["coach", "admin"], path);

  const { data: report } = await supabase
    .from("progress_reports")
    .select("id, player_id, blueprint_id, program_id, status")
    .eq("id", parsed.data.reportId)
    .maybeSingle();
  if (!report || report.status !== "draft") redirect(`${path}?notice=error`);
  const { data: blueprint } = report.blueprint_id
    ? await supabase
        .from("blueprints")
        .select("id, start_date, baseline_assessment_id")
        .eq("id", report.blueprint_id)
        .maybeSingle()
    : { data: null };

  const { error } = await supabase
    .from("progress_reports")
    .update(await reportFigures(supabase, report.player_id, blueprint, report.program_id))
    .eq("id", report.id);
  refresh(path);
  redirect(`${path}?notice=${error ? "error" : "report-refreshed"}`);
}

/** Saves the coach's text; with intent=submit also submits it for approval. */
export async function saveReport(reportId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(reportId).success) return { status: "error", message: saveFailed, values };
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const path = `/coach/reports/${reportId}`;
  const { supabase } = await signedInClient(["coach", "admin"], path);
  const { data, error } = await supabase
    .from("progress_reports")
    .update({
      coach_observations: parsed.data.coachObservations,
      strengths: parsed.data.strengths,
      next_priorities: parsed.data.nextPriorities,
      action_plan_30_day: parsed.data.actionPlan,
      recommended_program_id: parsed.data.recommendedProgramId,
    })
    .eq("id", reportId)
    .select("id");
  if (error || !data?.length) {
    return {
      status: "error",
      message: "This report can no longer be edited, or it isn't yours to edit.",
      values,
    };
  }

  if (formData.get("intent") === "submit") {
    const { error: submitError } = await supabase
      .from("progress_reports")
      .update({ status: "submitted" })
      .eq("id", reportId);
    if (submitError) {
      refresh(path);
      return {
        status: "error",
        message:
          submitError.code === "23514"
            ? "Your changes are saved. Add coach observations before submitting."
            : "Only the coach who wrote this report, or an administrator, can submit it.",
        fieldErrors:
          submitError.code === "23514" ? { coachObservations: ["Add your observations."] } : undefined,
        values,
      };
    }
    refresh(path);
    redirect(`${path}?notice=report-submitted`);
  }

  refresh(path);
  return { status: "success", message: "Draft saved.", values };
}

const statusChange = z.object({ reportId: z.uuid(), status: z.enum(["draft", "approved"]) });

export async function changeReportStatus(formData: FormData): Promise<void> {
  const parsed = statusChange.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/coach?notice=error");
  const { reportId, status } = parsed.data;
  const path = `/coach/reports/${reportId}`;
  const { supabase } = await signedInClient(["coach", "admin"], path);
  const { data, error } = await supabase
    .from("progress_reports")
    .update({ status })
    .eq("id", reportId)
    .select("id");
  refresh(path);
  redirect(
    `${path}?notice=${error || !data?.length ? "error" : status === "approved" ? "report-approved" : "report-returned"}`,
  );
}

/** Publishing is admin-only; the database checks the report was approved first. */
export async function publishReport(formData: FormData): Promise<void> {
  const parsed = reportForm.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/reports?notice=error");
  const { supabase } = await signedInClient(["admin"], "/admin/reports");
  const { data, error } = await supabase
    .from("progress_reports")
    .update({ status: "published" })
    .eq("id", parsed.data.reportId)
    .select("id");
  refresh(`/coach/reports/${parsed.data.reportId}`);
  redirect(`/admin/reports?notice=${error || !data?.length ? "error" : "report-published"}`);
}
