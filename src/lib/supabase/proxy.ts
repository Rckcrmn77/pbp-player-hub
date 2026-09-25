import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseConfig } from "@/lib/env";

import type { Database } from "./types";

/**
 * Refreshes the Supabase session cookie on each request and reports whether a
 * user is signed in. This is an early redirect only; pages and actions still
 * check the user themselves (see src/lib/auth/session.ts).
 */
export async function updateSession(request: NextRequest, requestHeaders: Headers = request.headers) {
  // Forward any extra request headers (the CSP nonce) to the page render.
  const next = () => NextResponse.next({ request: { headers: requestHeaders } });
  let response = next();
  const config = getSupabaseConfig();
  if (!config) return { response, signedIn: false };

  const supabase = createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        // Keep the forwarded headers' cookie line in step with the refreshed session.
        requestHeaders.set("cookie", request.cookies.toString());
        response = next();
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });

  // getClaims() verifies the session token; do not replace it with getSession().
  const { data } = await supabase.auth.getClaims();
  return { response, signedIn: Boolean(data?.claims?.sub) };
}
