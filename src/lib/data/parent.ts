import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AttendanceStatus, ConsentRecordRow, EnrollmentStatus, PlayerRow } from "@/lib/supabase/types";

/**
 * Reads for the parent area. Every query runs as the signed-in parent, so Row
 * Level Security limits results to their own family. Callers must have already
 * checked the role with requireRole().
 */

export const getMyPlayers = cache(async (): Promise<PlayerRow[]> => {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("players").select("*").order("first_name");
  if (error) throw new Error("Could not load players.");
  return data ?? [];
});

export const getMyPlayer = cache(async (id: string): Promise<PlayerRow | null> => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("players").select("*").eq("id", id).maybeSingle();
  if (error) return null;
  return data;
});

export const getMyConsentRecords = cache(async (): Promise<ConsentRecordRow[]> => {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("consent_records")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error("Could not load consent records.");
  return data ?? [];
});

export type PlayerProgram = {
  enrollmentId: string;
  playerId: string;
  programId: string;
  programName: string;
  status: EnrollmentStatus;
};

/** Programs the parent's players are on (programs in draft stay hidden from families). */
export const getMyPlayerPrograms = cache(async (): Promise<PlayerProgram[]> => {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data: enrollments, error } = await supabase.from("enrollments").select("*");
  if (error) throw new Error("Could not load programs.");
  if (!enrollments?.length) return [];
  const { data: programs } = await supabase
    .from("programs")
    .select("id, name")
    .in(
      "id",
      enrollments.map((e) => e.program_id),
    );
  const names = new Map((programs ?? []).map((p) => [p.id, p.name]));
  return enrollments
    .filter((e) => names.has(e.program_id))
    .map((e) => ({
      enrollmentId: e.id,
      playerId: e.player_id,
      programId: e.program_id,
      programName: names.get(e.program_id)!,
      status: e.status,
    }));
});

export type UpcomingSession = {
  id: string;
  startsAt: string;
  endsAt: string;
  location: string | null;
  programName: string;
  playerNames: string[];
};

/** The next sessions for programs the parent's players are on the roster for. */
export async function getMyUpcomingSessions(
  players: Pick<PlayerRow, "id" | "first_name">[],
  playerPrograms: PlayerProgram[],
  limit = 6,
): Promise<UpcomingSession[]> {
  const onRoster = playerPrograms.filter((p) => p.status === "active" || p.status === "pending");
  if (onRoster.length === 0) return [];
  const supabase = await createClient();
  if (!supabase) return [];
  const programIds = [...new Set(onRoster.map((p) => p.programId))];
  const [{ data: sessions }, { data: programs }] = await Promise.all([
    supabase
      .from("program_sessions")
      .select("*")
      .in("program_id", programIds)
      .eq("status", "scheduled")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(limit),
    supabase.from("programs").select("id, name, location").in("id", programIds),
  ]);
  const programById = new Map((programs ?? []).map((p) => [p.id, p]));
  const firstName = new Map(players.map((p) => [p.id, p.first_name]));
  return (sessions ?? []).map((s) => ({
    id: s.id,
    startsAt: s.starts_at,
    endsAt: s.ends_at,
    location: s.location ?? programById.get(s.program_id)?.location ?? null,
    programName: programById.get(s.program_id)?.name ?? "",
    playerNames: onRoster
      .filter((p) => p.programId === s.program_id)
      .map((p) => firstName.get(p.playerId) ?? "")
      .filter(Boolean),
  }));
}

/** Programs open for registration, with PBP's registration link. */
export const getOpenPrograms = cache(async () => {
  const supabase = await createClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("programs")
    .select("id, name, location, start_date, end_date, schedule_description, registration_url")
    .eq("status", "open")
    .order("start_date");
  return data ?? [];
});

export type AttendanceSummary = Record<AttendanceStatus, number>;

export async function getAttendanceSummary(playerId: string): Promise<AttendanceSummary> {
  const summary: AttendanceSummary = { present: 0, absent: 0, excused: 0, makeup: 0 };
  const supabase = await createClient();
  if (!supabase) return summary;
  const { data } = await supabase.from("attendance").select("status").eq("player_id", playerId);
  for (const row of data ?? []) summary[row.status] += 1;
  return summary;
}
