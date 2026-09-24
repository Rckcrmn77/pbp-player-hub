import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { recordSignupConsent } from "@/lib/auth/signup-consent";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation/auth";

const otpTypes: EmailOtpType[] = ["email", "signup", "magiclink", "recovery", "invite", "email_change"];

/**
 * Landing point for links in sign-up, sign-in and password-reset emails.
 * Supports the token-hash links used by this project's email templates and
 * the code links Supabase sends by default.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const failure = new URL("/login?error=link", request.url);

  const supabase = await createClient();
  if (!supabase) return NextResponse.redirect(failure);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  let ok = false;
  if (tokenHash && type && otpTypes.includes(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }
  if (!ok) return NextResponse.redirect(failure);

  const { data } = await supabase.auth.getUser();
  if (data.user) await recordSignupConsent(supabase, data.user);

  return NextResponse.redirect(new URL(type === "recovery" ? "/reset-password" : next, request.url));
}
