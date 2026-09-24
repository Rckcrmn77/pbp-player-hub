"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FormState } from "@/lib/validation/form";
import { parseAttendance } from "@/lib/validation/staff";

/**
 * Saves attendance for one session. Row Level Security only accepts rows for
 * sessions in programs the coach is assigned to, and only for players on that
 * program's roster.
 */
export async function saveAttendance(
  sessionId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!z.uuid().safeParse(sessionId).success)
    return { status: "error", message: "That session was not found." };
  const user = await requireRole(["coach", "admin"], `/coach/sessions/${sessionId}`);
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: "Sign-in is not set up in this environment." };

  const rows = parseAttendance(formData);
  if (rows.length === 0) return { status: "error", message: "Mark at least one player before saving." };

  const { error } = await supabase.from("attendance").upsert(
    rows.map((r) => ({
      session_id: sessionId,
      player_id: r.playerId,
      status: r.status,
      recorded_by: user.id,
    })),
    { onConflict: "session_id,player_id" },
  );
  if (error) return { status: "error", message: "We couldn't save attendance. Please try again." };

  revalidatePath("/coach", "layout");
  revalidatePath("/parent", "layout");
  return {
    status: "success",
    message: `Attendance saved for ${rows.length} player${rows.length === 1 ? "" : "s"}.`,
  };
}
