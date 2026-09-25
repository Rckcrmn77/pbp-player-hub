/**
 * Public configuration read from environment variables.
 *
 * Only `NEXT_PUBLIC_` values are used here: the Supabase URL and publishable
 * (anon) key are designed to be public and are protected by Row Level Security.
 * The Supabase secret key is deliberately not used anywhere in the app.
 */

export type SupabaseConfig = { url: string; publishableKey: string };

/** Returns null when Supabase is not configured (for example in UI-only CI jobs). */
export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

/** Base URL used in email links. Falls back to local development. */
export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (configured || "http://localhost:3000").replace(/\/+$/, "");
}

/** Where pilot families and staff send questions and feedback; the footer link is hidden when unset. */
export function getFeedbackEmail(): string | null {
  const email = process.env.NEXT_PUBLIC_FEEDBACK_EMAIL?.trim();
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
