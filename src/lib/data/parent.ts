import "server-only";

import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { ConsentRecordRow, PlayerRow } from "@/lib/supabase/types";

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
