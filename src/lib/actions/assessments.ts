"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  blueprintDrillSchema,
  blueprintSchema,
  parseScores,
  prioritySchema,
  startAssessmentSchema,
  summarySchema,
} from "@/lib/validation/assessment";
import { formValues, validationError, type FormState } from "@/lib/validation/form";
import { dateKey } from "@/lib/time";

/**
 * Coach actions for assessments and Blueprints. Row Level Security limits
 * every write to players on the coach's rosters, and database triggers enforce
 * the review workflow (who may submit, approve, and publish).
 */

const saveFailed = "We couldn't save that. Please try again.";
const uuid = z.uuid();

async function staffClient(next: string) {
  const user = await requireRole(["coach", "admin"], next);
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  return { user, supabase };
}

function refresh(...paths: string[]) {
  for (const path of paths) revalidatePath(path);
  revalidatePath("/coach", "layout");
  revalidatePath("/admin/assessments");
  revalidatePath("/parent", "layout");
}

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

export async function startAssessment(
  playerId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(playerId).success) return { status: "error", message: saveFailed, values };
  const parsed = startAssessmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const { supabase } = await staffClient(`/coach/players/${playerId}`);
  const id = crypto.randomUUID();
  const { error } = await supabase.from("assessments").insert({
    id,
    player_id: playerId,
    template_id: parsed.data.templateId,
    assessment_type: parsed.data.assessmentType,
    program_id: parsed.data.programId,
    assessed_on: parsed.data.assessedOn,
  });
  if (error) {
    return {
      status: "error",
      message: "We couldn't start the assessment. Coaches can assess players on their own program rosters.",
      values,
    };
  }

  refresh(`/coach/players/${playerId}`);
  redirect(`/coach/assessments/${id}?notice=assessment-started`);
}

/** Saves ratings, comments and the summary; with intent=submit also submits for approval. */
export async function saveAssessment(
  assessmentId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(assessmentId).success) return { status: "error", message: saveFailed, values };
  const { scores, errors } = parseScores(formData);
  const summary = summarySchema.safeParse(String(formData.get("summary") ?? ""));
  if (Object.keys(errors).length > 0 || !summary.success) {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: {
        ...errors,
        ...(summary.success ? {} : { summary: ["Keep the summary under 4000 characters."] }),
      },
      values,
    };
  }

  const path = `/coach/assessments/${assessmentId}`;
  const { supabase } = await staffClient(path);

  const rated = scores.filter((s) => s.rating !== null);
  const cleared = scores.filter((s) => s.rating === null).map((s) => s.criterionId);
  if (rated.length > 0) {
    const { error } = await supabase.from("assessment_scores").upsert(
      rated.map((s) => ({
        assessment_id: assessmentId,
        criterion_id: s.criterionId,
        rating: s.rating!,
        comment: s.comment,
      })),
      { onConflict: "assessment_id,criterion_id" },
    );
    if (error)
      return {
        status: "error",
        message: "This assessment can no longer be edited, or it isn't yours to edit.",
        values,
      };
  }
  if (cleared.length > 0) {
    await supabase
      .from("assessment_scores")
      .delete()
      .eq("assessment_id", assessmentId)
      .in("criterion_id", cleared);
  }
  const { error: summaryError } = await supabase
    .from("assessments")
    .update({ summary: summary.data })
    .eq("id", assessmentId);
  if (summaryError) return { status: "error", message: saveFailed, values };

  if (formData.get("intent") === "submit") {
    const { error } = await supabase
      .from("assessments")
      .update({ status: "submitted" })
      .eq("id", assessmentId);
    if (error) {
      refresh(path);
      return {
        status: "error",
        message:
          error.code === "23514"
            ? "Your ratings are saved. Every criterion needs a rating and a comment before you can submit."
            : "Only the coach who wrote this assessment, or an administrator, can submit it.",
        values,
      };
    }
    refresh(path);
    redirect(`${path}?notice=assessment-submitted`);
  }

  refresh(path);
  return { status: "success", message: "Draft saved.", values };
}

const statusChange = z.object({
  assessmentId: z.uuid(),
  status: z.enum(["draft", "approved"]),
});

/** Approve (coach assigned to the player, or admin) or return to draft. */
export async function changeAssessmentStatus(formData: FormData): Promise<void> {
  const parsed = statusChange.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/coach?notice=error");
  const { assessmentId, status } = parsed.data;
  const path = `/coach/assessments/${assessmentId}`;

  const { supabase } = await staffClient(path);
  const { data, error } = await supabase
    .from("assessments")
    .update({ status })
    .eq("id", assessmentId)
    .select("id");

  refresh(path);
  redirect(
    `${path}?notice=${error || !data?.length ? "error" : status === "approved" ? "assessment-approved" : "assessment-returned"}`,
  );
}

// ---------------------------------------------------------------------------
// Blueprints
// ---------------------------------------------------------------------------

const newBlueprint = z.object({
  playerId: z.uuid(),
  baselineAssessmentId: z.union([z.literal(""), z.uuid()]).transform((v) => (v === "" ? null : v)),
  programId: z.union([z.literal(""), z.uuid()]).transform((v) => (v === "" ? null : v)),
  playerGoals: z
    .string()
    .max(2000)
    .transform((v) => v.trim() || null),
});

export async function createBlueprint(formData: FormData): Promise<void> {
  const parsed = newBlueprint.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/coach?notice=error");
  const { playerId, baselineAssessmentId, programId, playerGoals } = parsed.data;

  const { supabase } = await staffClient(`/coach/players/${playerId}`);
  const id = crypto.randomUUID();
  const { error } = await supabase.from("blueprints").insert({
    id,
    player_id: playerId,
    baseline_assessment_id: baselineAssessmentId,
    program_id: programId,
    player_goals: playerGoals,
    start_date: dateKey(new Date()),
  });
  if (error) redirect(`/coach/players/${playerId}?notice=error`);

  refresh(`/coach/players/${playerId}`);
  redirect(`/coach/blueprints/${id}?notice=blueprint-created`);
}

export async function updateBlueprint(
  blueprintId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(blueprintId).success) return { status: "error", message: saveFailed, values };
  const parsed = blueprintSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const path = `/coach/blueprints/${blueprintId}`;
  const { supabase } = await staffClient(path);
  const { data, error } = await supabase
    .from("blueprints")
    .update({
      player_goals: parsed.data.playerGoals,
      coach_summary: parsed.data.coachSummary,
      start_date: parsed.data.startDate,
      review_date: parsed.data.reviewDate,
    })
    .eq("id", blueprintId)
    .select("id");
  if (error || !data?.length) return { status: "error", message: saveFailed, values };

  refresh(path);
  return { status: "success", message: "Blueprint saved.", values };
}

export async function savePriority(
  blueprintId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(blueprintId).success) return { status: "error", message: saveFailed, values };
  const parsed = prioritySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const path = `/coach/blueprints/${blueprintId}`;
  const { supabase } = await staffClient(path);
  const { error } = await supabase.from("blueprint_priorities").upsert(
    {
      blueprint_id: blueprintId,
      rank: parsed.data.rank,
      title: parsed.data.title,
      description: parsed.data.description,
    },
    { onConflict: "blueprint_id,rank" },
  );
  if (error) return { status: "error", message: saveFailed, values };

  refresh(path);
  return { status: "success", message: `Priority ${parsed.data.rank} saved.`, values };
}

const itemRemoval = z.object({ blueprintId: z.uuid(), itemId: z.uuid() });

export async function removePriority(formData: FormData): Promise<void> {
  const parsed = itemRemoval.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/coach?notice=error");
  const path = `/coach/blueprints/${parsed.data.blueprintId}`;
  const { supabase } = await staffClient(path);
  const { error } = await supabase.from("blueprint_priorities").delete().eq("id", parsed.data.itemId);
  refresh(path);
  redirect(`${path}?notice=${error ? "error" : "priority-removed"}`);
}

export async function assignDrill(
  blueprintId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(blueprintId).success) return { status: "error", message: saveFailed, values };
  const parsed = blueprintDrillSchema.safeParse({
    ...Object.fromEntries(formData),
    isAtHome: formData.get("isAtHome") === "on",
  });
  if (!parsed.success) return validationError(parsed.error, values);

  const path = `/coach/blueprints/${blueprintId}`;
  const { supabase } = await staffClient(path);
  const { error } = await supabase.from("blueprint_drills").insert({
    blueprint_id: blueprintId,
    drill_id: parsed.data.drillId,
    weekly_reps_target: parsed.data.weeklyReps,
    weekly_minutes_target: parsed.data.weeklyMinutes,
    instructions: parsed.data.instructions,
    is_at_home: parsed.data.isAtHome,
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "23505" ? "That drill is already in this Blueprint." : saveFailed,
      values,
    };
  }

  refresh(path);
  redirect(`${path}?notice=drill-assigned`);
}

export async function removeAssignedDrill(formData: FormData): Promise<void> {
  const parsed = itemRemoval.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/coach?notice=error");
  const path = `/coach/blueprints/${parsed.data.blueprintId}`;
  const { supabase } = await staffClient(path);
  const { error } = await supabase.from("blueprint_drills").delete().eq("id", parsed.data.itemId);
  refresh(path);
  redirect(`${path}?notice=${error ? "error" : "drill-removed"}`);
}

const blueprintStatusChange = z.object({
  blueprintId: z.uuid(),
  playerId: z.uuid(),
  status: z.enum(["draft", "active", "completed", "archived"]),
});

/** Making a Blueprint active completes the player's previous active Blueprint (only one can be active). */
export async function setBlueprintStatus(formData: FormData): Promise<void> {
  const parsed = blueprintStatusChange.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/coach?notice=error");
  const { blueprintId, playerId, status } = parsed.data;
  const path = `/coach/blueprints/${blueprintId}`;

  const { supabase } = await staffClient(path);
  if (status === "active") {
    await supabase
      .from("blueprints")
      .update({ status: "completed" })
      .eq("player_id", playerId)
      .eq("status", "active")
      .neq("id", blueprintId);
  }
  const { data, error } = await supabase
    .from("blueprints")
    .update({ status })
    .eq("id", blueprintId)
    .select("id");

  refresh(path, `/coach/players/${playerId}`);
  redirect(
    `${path}?notice=${error || !data?.length ? "error" : status === "active" ? "blueprint-activated" : "blueprint-saved"}`,
  );
}
