import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { AppRole, ProfileRow } from "@/lib/supabase/types";

export type SessionUser = {
  id: string;
  email: string;
  profile: ProfileRow;
};

/**
 * The signed-in user and their profile, verified on the server.
 * Memoized per request. Returns null when signed out or Supabase is not configured.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!profile) return null;

  return { id: userId, email: String(data.claims.email ?? ""), profile };
});

export function homePathFor(role: AppRole): string {
  if (role === "admin") return "/admin";
  if (role === "coach") return "/coach";
  return "/parent";
}

/** Redirects to sign-in unless someone is signed in. */
export async function requireUser(next: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Redirects unless the signed-in user has one of the given roles. */
export async function requireRole(roles: AppRole[], next: string): Promise<SessionUser> {
  const user = await requireUser(next);
  if (!roles.includes(user.profile.role)) redirect(homePathFor(user.profile.role));
  return user;
}
