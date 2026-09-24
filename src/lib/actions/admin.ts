"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addDays, zonedToUtc } from "@/lib/time";
import { formValues, validationError, type FormState } from "@/lib/validation/form";
import {
  assignmentSchema,
  enrollmentSchema,
  programSchema,
  roleChangeSchema,
  sessionSchema,
  toProgramColumns,
} from "@/lib/validation/staff";

const saveFailed = "We couldn't save that. Please try again.";
const uuid = z.uuid();

/** Every admin action runs as the signed-in admin; Row Level Security applies to each query too. */
async function adminClient(next: string) {
  const user = await requireRole(["admin"], next);
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  return { user, supabase };
}

function programPath(programId: string) {
  return `/admin/programs/${programId}`;
}

function done(programId: string, notice: string): never {
  revalidatePath(programPath(programId));
  revalidatePath("/coach", "layout");
  redirect(`${programPath(programId)}?notice=${notice}`);
}

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------

export async function createProgram(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = programSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const { supabase } = await adminClient("/admin/programs/new");
  const id = crypto.randomUUID();
  const { error } = await supabase.from("programs").insert({ id, ...toProgramColumns(parsed.data) });
  if (error) return { status: "error", message: saveFailed, values };

  revalidatePath("/admin", "layout");
  redirect(`${programPath(id)}?notice=program-created`);
}

export async function updateProgram(
  programId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(programId).success) return { status: "error", message: saveFailed, values };
  const parsed = programSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const { supabase } = await adminClient(`${programPath(programId)}/edit`);
  const { data, error } = await supabase
    .from("programs")
    .update(toProgramColumns(parsed.data))
    .eq("id", programId)
    .select("id");
  if (error || !data?.length) return { status: "error", message: saveFailed, values };

  revalidatePath("/admin", "layout");
  done(programId, "program-saved");
}

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

export async function addSessions(
  programId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(programId).success) return { status: "error", message: saveFailed, values };
  const parsed = sessionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const { date, startTime, endTime, location, repeatWeeks } = parsed.data;
  const rows = Array.from({ length: repeatWeeks }, (_, week) => {
    const day = addDays(date, week * 7);
    return {
      program_id: programId,
      starts_at: zonedToUtc(day, startTime).toISOString(),
      ends_at: zonedToUtc(day, endTime).toISOString(),
      location,
    };
  });

  const { supabase } = await adminClient(programPath(programId));
  const { error } = await supabase.from("program_sessions").insert(rows);
  if (error) return { status: "error", message: saveFailed, values };

  done(programId, repeatWeeks === 1 ? "session-added" : "sessions-added");
}

const sessionStatusChange = z.object({
  programId: z.uuid(),
  sessionId: z.uuid(),
  status: z.enum(["scheduled", "cancelled"]),
});

export async function setSessionStatus(formData: FormData): Promise<void> {
  const parsed = sessionStatusChange.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/programs?notice=error");
  const { programId, sessionId, status } = parsed.data;

  const { supabase } = await adminClient(programPath(programId));
  const { error } = await supabase.from("program_sessions").update({ status }).eq("id", sessionId);
  done(programId, error ? "error" : status === "cancelled" ? "session-cancelled" : "session-restored");
}

// ---------------------------------------------------------------------------
// Coach assignments
// ---------------------------------------------------------------------------

export async function assignCoach(
  programId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(programId).success) return { status: "error", message: saveFailed, values };
  const parsed = assignmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const { supabase } = await adminClient(programPath(programId));
  const { error } = await supabase.from("program_coaches").insert({
    program_id: programId,
    coach_id: parsed.data.coachId,
    assignment_role: parsed.data.assignmentRole,
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "23505" ? "That coach is already assigned to this program." : saveFailed,
      values,
    };
  }

  done(programId, "coach-assigned");
}

const assignmentRemoval = z.object({ programId: z.uuid(), assignmentId: z.uuid() });

export async function removeCoach(formData: FormData): Promise<void> {
  const parsed = assignmentRemoval.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/programs?notice=error");
  const { programId, assignmentId } = parsed.data;

  const { supabase } = await adminClient(programPath(programId));
  const { error } = await supabase.from("program_coaches").delete().eq("id", assignmentId);
  done(programId, error ? "error" : "coach-removed");
}

// ---------------------------------------------------------------------------
// Roster
// ---------------------------------------------------------------------------

export async function enrollPlayer(
  programId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = formValues(formData);
  if (!uuid.safeParse(programId).success) return { status: "error", message: saveFailed, values };
  const parsed = enrollmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, values);

  const { supabase } = await adminClient(programPath(programId));
  const { error } = await supabase.from("enrollments").insert({
    program_id: programId,
    player_id: parsed.data.playerId,
    status: parsed.data.status,
  });
  if (error) {
    return {
      status: "error",
      message: error.code === "23505" ? "That player is already on this roster." : saveFailed,
      values,
    };
  }

  done(programId, "player-enrolled");
}

const enrollmentStatusChange = z.object({
  programId: z.uuid(),
  enrollmentId: z.uuid(),
  status: z.enum(["pending", "active", "waitlisted", "withdrawn", "completed"]),
});

export async function setEnrollmentStatus(formData: FormData): Promise<void> {
  const parsed = enrollmentStatusChange.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/programs?notice=error");
  const { programId, enrollmentId, status } = parsed.data;

  const { supabase } = await adminClient(programPath(programId));
  const { error } = await supabase.from("enrollments").update({ status }).eq("id", enrollmentId);
  done(programId, error ? "error" : "roster-updated");
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export async function changeRole(formData: FormData): Promise<void> {
  const parsed = roleChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/people?notice=error");

  const { user, supabase } = await adminClient("/admin/people");
  // The database also blocks this; checking here gives a clearer message.
  if (parsed.data.profileId === user.id) redirect("/admin/people?notice=own-role");

  const { data, error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.profileId)
    .select("id");

  revalidatePath("/admin", "layout");
  redirect(`/admin/people?notice=${error || !data?.length ? "error" : "role-changed"}`);
}

const coachActiveChange = z.object({
  profileId: z.uuid(),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export async function setCoachActive(formData: FormData): Promise<void> {
  const parsed = coachActiveChange.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/people?notice=error");

  const { supabase } = await adminClient("/admin/people");
  const { data, error } = await supabase
    .from("coaches")
    .update({ is_active: parsed.data.active })
    .eq("profile_id", parsed.data.profileId)
    .select("profile_id");

  revalidatePath("/admin", "layout");
  redirect(
    `/admin/people?notice=${error || !data?.length ? "error" : parsed.data.active ? "coach-activated" : "coach-deactivated"}`,
  );
}
