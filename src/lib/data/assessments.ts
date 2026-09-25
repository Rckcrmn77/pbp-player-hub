import "server-only";

import { cache } from "react";

import { createClient, type ServerClient } from "@/lib/supabase/server";
import type {
  AssessmentCriterionRow,
  AssessmentRow,
  AssessmentScoreRow,
  AssessmentTemplateRow,
  BlueprintDrillRow,
  BlueprintPriorityRow,
  BlueprintRow,
  DrillRow,
  PlayerRow,
  ReviewStatus,
} from "@/lib/supabase/types";

/**
 * Reads for assessments, templates, drills and Blueprints. Every query runs as
 * the signed-in user, so Row Level Security decides what comes back (families
 * see only published assessments and non-draft Blueprints for their players).
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

// ---------------------------------------------------------------------------
// Drills and templates
// ---------------------------------------------------------------------------

export const listDrills = cache(async (): Promise<DrillRow[]> => {
  const supabase = await client();
  return must(await supabase.from("drills").select("*").order("skill_category").order("title"), "drills");
});

export const getDrill = cache(async (id: string): Promise<DrillRow | null> => {
  const supabase = await client();
  const { data } = await supabase.from("drills").select("*").eq("id", id).maybeSingle();
  return data;
});

export const listTemplates = cache(async (): Promise<AssessmentTemplateRow[]> => {
  const supabase = await client();
  return must(await supabase.from("assessment_templates").select("*").order("name"), "templates");
});

export const getTemplate = cache(async (id: string): Promise<AssessmentTemplateRow | null> => {
  const supabase = await client();
  const { data } = await supabase.from("assessment_templates").select("*").eq("id", id).maybeSingle();
  return data;
});

export const getCriteria = cache(async (templateId: string): Promise<AssessmentCriterionRow[]> => {
  const supabase = await client();
  return must(
    await supabase.from("assessment_criteria").select("*").eq("template_id", templateId).order("sort_order"),
    "criteria",
  );
});

// ---------------------------------------------------------------------------
// Players (staff and parent views share these reads)
// ---------------------------------------------------------------------------

export const getPlayer = cache(async (id: string): Promise<PlayerRow | null> => {
  const supabase = await client();
  const { data } = await supabase.from("players").select("*").eq("id", id).maybeSingle();
  return data;
});

// ---------------------------------------------------------------------------
// Assessments
// ---------------------------------------------------------------------------

export const listPlayerAssessments = cache(async (playerId: string): Promise<AssessmentRow[]> => {
  const supabase = await client();
  return must(
    await supabase
      .from("assessments")
      .select("*")
      .eq("player_id", playerId)
      .order("assessed_on", { ascending: false })
      .order("created_at", { ascending: false }),
    "assessments",
  );
});

export type AssessmentDetail = {
  assessment: AssessmentRow;
  template: AssessmentTemplateRow | null;
  criteria: AssessmentCriterionRow[];
  scores: AssessmentScoreRow[];
  player: PlayerRow | null;
  coachName: string;
};

export const getAssessmentDetail = cache(async (id: string): Promise<AssessmentDetail | null> => {
  const supabase = await client();
  const { data: assessment } = await supabase.from("assessments").select("*").eq("id", id).maybeSingle();
  if (!assessment) return null;
  const [template, criteria, scores, player, coach] = await Promise.all([
    getTemplate(assessment.template_id),
    getCriteria(assessment.template_id),
    supabase.from("assessment_scores").select("*").eq("assessment_id", id),
    getPlayer(assessment.player_id),
    supabase.from("profiles").select("first_name, last_name").eq("id", assessment.coach_id).maybeSingle(),
  ]);
  return {
    assessment,
    template,
    criteria,
    scores: must(scores, "scores"),
    player,
    coachName: coach.data ? `${coach.data.first_name} ${coach.data.last_name}`.trim() : "PBP coach",
  };
});

export type QueueItem = AssessmentRow & { playerName: string };

/** Assessments waiting for approval or publication that the user can see. */
export const listReviewQueue = cache(async (statuses: ReviewStatus[]): Promise<QueueItem[]> => {
  const supabase = await client();
  const assessments = must(
    await supabase.from("assessments").select("*").in("status", statuses).order("submitted_at"),
    "review queue",
  );
  if (assessments.length === 0) return [];
  const players = must(
    await supabase
      .from("players")
      .select("id, first_name, last_name")
      .in(
        "id",
        assessments.map((a) => a.player_id),
      ),
    "players",
  );
  const names = new Map(players.map((p) => [p.id, `${p.first_name} ${p.last_name}`]));
  return assessments.map((a) => ({ ...a, playerName: names.get(a.player_id) ?? "Player" }));
});

// ---------------------------------------------------------------------------
// Blueprints
// ---------------------------------------------------------------------------

export const listPlayerBlueprints = cache(async (playerId: string): Promise<BlueprintRow[]> => {
  const supabase = await client();
  return must(
    await supabase
      .from("blueprints")
      .select("*")
      .eq("player_id", playerId)
      .order("start_date", { ascending: false }),
    "Blueprints",
  );
});

export type BlueprintDetail = {
  blueprint: BlueprintRow;
  priorities: BlueprintPriorityRow[];
  drills: (BlueprintDrillRow & { drill: DrillRow | null })[];
};

export const getBlueprintDetail = cache(async (id: string): Promise<BlueprintDetail | null> => {
  const supabase = await client();
  const { data: blueprint } = await supabase.from("blueprints").select("*").eq("id", id).maybeSingle();
  if (!blueprint) return null;
  const [priorities, assigned] = await Promise.all([
    supabase.from("blueprint_priorities").select("*").eq("blueprint_id", id).order("rank"),
    supabase
      .from("blueprint_drills")
      .select("*")
      .eq("blueprint_id", id)
      .order("sort_order")
      .order("created_at"),
  ]);
  const assignedRows = must(assigned, "assigned drills");
  const drillIds = assignedRows.map((a) => a.drill_id);
  const drills = drillIds.length
    ? must(await supabase.from("drills").select("*").in("id", drillIds), "drills")
    : [];
  const byId = new Map(drills.map((d) => [d.id, d]));
  return {
    blueprint,
    priorities: must(priorities, "priorities"),
    drills: assignedRows.map((a) => ({ ...a, drill: byId.get(a.drill_id) ?? null })),
  };
});

/** The player's active Blueprint, if any (families only ever see non-drafts). */
export async function getActiveBlueprint(playerId: string): Promise<BlueprintDetail | null> {
  const supabase = await client();
  const { data } = await supabase
    .from("blueprints")
    .select("id")
    .eq("player_id", playerId)
    .eq("status", "active")
    .maybeSingle();
  return data ? getBlueprintDetail(data.id) : null;
}

/** Of the given players, those with no baseline assessment yet (any status). */
export async function playersWithoutBaseline(playerIds: string[]): Promise<Set<string>> {
  if (playerIds.length === 0) return new Set();
  const supabase = await client();
  const { data } = await supabase
    .from("assessments")
    .select("player_id")
    .eq("assessment_type", "baseline")
    .in("player_id", playerIds);
  const assessed = new Set((data ?? []).map((a) => a.player_id));
  return new Set(playerIds.filter((id) => !assessed.has(id)));
}
