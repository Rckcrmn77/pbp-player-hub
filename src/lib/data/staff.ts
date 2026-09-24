import "server-only";

import { cache } from "react";

import { onRosterStatuses } from "@/config/program-options";
import { createClient, type ServerClient } from "@/lib/supabase/server";
import type {
  AppRole,
  AttendanceRow,
  EnrollmentRow,
  PlayerRow,
  ProgramCoachRow,
  ProgramRow,
  ProgramSessionRow,
} from "@/lib/supabase/types";

/**
 * Reads for the admin and coach areas. Queries run as the signed-in user, so
 * Row Level Security decides what comes back: admins see everything, coaches
 * see only the programs they are assigned to and the players on those rosters.
 * Callers must have already checked the role with requireRole().
 */

async function client(): Promise<ServerClient> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

function must<T>(result: { data: T | null; error: unknown }, what: string): T {
  if (result.error || result.data === null) throw new Error(`Could not load ${what}.`);
  return result.data;
}

export type PersonSummary = { id: string; name: string };

function fullName(p: { first_name: string; last_name: string }) {
  return `${p.first_name} ${p.last_name}`.trim() || "(no name yet)";
}

// ---------------------------------------------------------------------------
// Programs
// ---------------------------------------------------------------------------

export const listPrograms = cache(async (): Promise<ProgramRow[]> => {
  const supabase = await client();
  return must(
    await supabase.from("programs").select("*").order("start_date", { ascending: false }),
    "programs",
  );
});

export const getProgram = cache(async (id: string): Promise<ProgramRow | null> => {
  const supabase = await client();
  const { data } = await supabase.from("programs").select("*").eq("id", id).maybeSingle();
  return data;
});

export const getProgramSessions = cache(async (programId: string): Promise<ProgramSessionRow[]> => {
  const supabase = await client();
  return must(
    await supabase.from("program_sessions").select("*").eq("program_id", programId).order("starts_at"),
    "sessions",
  );
});

export type AssignedCoach = ProgramCoachRow & { name: string };

export const getProgramCoaches = cache(async (programId: string): Promise<AssignedCoach[]> => {
  const supabase = await client();
  const assignments = must(
    await supabase.from("program_coaches").select("*").eq("program_id", programId).order("assignment_role"),
    "coach assignments",
  );
  const names = await profileNames(
    supabase,
    assignments.map((a) => a.coach_id),
  );
  return assignments.map((a) => ({ ...a, name: names.get(a.coach_id) ?? "Coach" }));
});

export type RosterEntry = EnrollmentRow & { player: PlayerRow };

export const getRoster = cache(async (programId: string): Promise<RosterEntry[]> => {
  const supabase = await client();
  const enrollments = must(
    await supabase.from("enrollments").select("*").eq("program_id", programId),
    "roster",
  );
  if (enrollments.length === 0) return [];
  const players = must(
    await supabase
      .from("players")
      .select("*")
      .in(
        "id",
        enrollments.map((e) => e.player_id),
      ),
    "players",
  );
  const byId = new Map(players.map((p) => [p.id, p]));
  return enrollments
    .filter((e) => byId.has(e.player_id))
    .map((e) => ({ ...e, player: byId.get(e.player_id)! }))
    .sort(
      (a, b) =>
        a.player.last_name.localeCompare(b.player.last_name) ||
        a.player.first_name.localeCompare(b.player.first_name),
    );
});

// ---------------------------------------------------------------------------
// Admin lookups
// ---------------------------------------------------------------------------

export const listAllPlayers = cache(async (): Promise<PlayerRow[]> => {
  const supabase = await client();
  return must(await supabase.from("players").select("*").order("last_name").order("first_name"), "players");
});

export const listActiveCoaches = cache(async (): Promise<PersonSummary[]> => {
  const supabase = await client();
  const coaches = must(await supabase.from("coaches").select("profile_id").eq("is_active", true), "coaches");
  const ids = coaches.map((c) => c.profile_id);
  if (ids.length === 0) return [];
  const profiles = must(
    await supabase.from("profiles").select("id, first_name, last_name, role").in("id", ids),
    "coach profiles",
  );
  return profiles
    .filter((p) => p.role === "coach" || p.role === "admin")
    .map((p) => ({ id: p.id, name: fullName(p) }))
    .sort((a, b) => a.name.localeCompare(b.name));
});

export type PersonRow = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  coachActive: boolean | null;
  createdAt: string;
};

export const listPeople = cache(async (): Promise<PersonRow[]> => {
  const supabase = await client();
  const [profiles, emails, coaches] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("profile_emails").select("profile_id, email"),
    supabase.from("coaches").select("profile_id, is_active"),
  ]);
  const emailById = new Map(must(emails, "emails").map((e) => [e.profile_id, e.email]));
  const coachById = new Map(must(coaches, "coaches").map((c) => [c.profile_id, c.is_active]));
  return must(profiles, "people").map((p) => ({
    id: p.id,
    name: fullName(p),
    email: emailById.get(p.id) ?? "",
    role: p.role,
    coachActive: coachById.get(p.id) ?? null,
    createdAt: p.created_at,
  }));
});

export const getAdminCounts = cache(async () => {
  const supabase = await client();
  const count = async (table: "players" | "programs" | "enrollments", filter?: [string, string]) => {
    let query = supabase.from(table).select("*", { count: "exact", head: true });
    if (filter) query = query.eq(filter[0], filter[1]);
    const { count: n } = await query;
    return n ?? 0;
  };
  const [players, programs, openPrograms, activePrograms, people] = await Promise.all([
    count("players"),
    count("programs"),
    count("programs", ["status", "open"]),
    count("programs", ["status", "active"]),
    supabase.from("profiles").select("role"),
  ]);
  const roles = must(people, "people");
  return {
    players,
    programs,
    openPrograms,
    activePrograms,
    parents: roles.filter((r) => r.role === "parent").length,
    coaches: roles.filter((r) => r.role === "coach").length,
    admins: roles.filter((r) => r.role === "admin").length,
  };
});

// ---------------------------------------------------------------------------
// Coach views
// ---------------------------------------------------------------------------

export type CoachProgram = ProgramRow & {
  assignmentRole: ProgramCoachRow["assignment_role"];
  rosterCount: number;
};

export const getMyCoachPrograms = cache(async (coachId: string): Promise<CoachProgram[]> => {
  const supabase = await client();
  const assignments = must(
    await supabase.from("program_coaches").select("*").eq("coach_id", coachId),
    "assignments",
  );
  if (assignments.length === 0) return [];
  const programIds = assignments.map((a) => a.program_id);
  const [programs, enrollments] = await Promise.all([
    supabase.from("programs").select("*").in("id", programIds).order("start_date"),
    supabase.from("enrollments").select("program_id, status").in("program_id", programIds),
  ]);
  const roleById = new Map(assignments.map((a) => [a.program_id, a.assignment_role]));
  const rosterCounts = new Map<string, number>();
  for (const e of must(enrollments, "rosters")) {
    if (onRosterStatuses.includes(e.status))
      rosterCounts.set(e.program_id, (rosterCounts.get(e.program_id) ?? 0) + 1);
  }
  return must(programs, "programs").map((p) => ({
    ...p,
    assignmentRole: roleById.get(p.id)!,
    rosterCount: rosterCounts.get(p.id) ?? 0,
  }));
});

export type SessionWithProgram = ProgramSessionRow & { programName: string };

/** Sessions in the given programs between two instants, soonest first. */
export async function getSessionsBetween(
  programs: Pick<ProgramRow, "id" | "name">[],
  from: string,
  to: string,
): Promise<SessionWithProgram[]> {
  if (programs.length === 0) return [];
  const supabase = await client();
  const sessions = must(
    await supabase
      .from("program_sessions")
      .select("*")
      .in(
        "program_id",
        programs.map((p) => p.id),
      )
      .gte("starts_at", from)
      .lt("starts_at", to)
      .order("starts_at"),
    "sessions",
  );
  const names = new Map(programs.map((p) => [p.id, p.name]));
  return sessions.map((s) => ({ ...s, programName: names.get(s.program_id) ?? "" }));
}

export const getSession = cache(async (sessionId: string): Promise<ProgramSessionRow | null> => {
  const supabase = await client();
  const { data } = await supabase.from("program_sessions").select("*").eq("id", sessionId).maybeSingle();
  return data;
});

export async function getAttendanceForSessions(sessionIds: string[]): Promise<AttendanceRow[]> {
  if (sessionIds.length === 0) return [];
  const supabase = await client();
  return must(await supabase.from("attendance").select("*").in("session_id", sessionIds), "attendance");
}

async function profileNames(supabase: ServerClient, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
  return new Map((data ?? []).map((p) => [p.id, fullName(p)]));
}
