/**
 * HTTP security headers. The Content-Security-Policy uses a fresh nonce per
 * request (set in src/proxy.ts); Next.js adds it to its own scripts. The app
 * loads no third-party scripts, fonts or analytics, and the browser never
 * talks to Supabase directly, so everything is limited to this site.
 */

export function contentSecurityPolicy(nonce: string, { dev = false, https = false } = {}): string {
  return [
    "default-src 'self'",
    // 'strict-dynamic' lets Next.js's nonce-bearing scripts load their chunks.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes (e.g. rating bar widths) need 'unsafe-inline'; styles cannot run code.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(https ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/** Headers that are the same on every response (see next.config.ts). */
export const staticSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Browsers ignore this over plain http (local development).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

/** Search engines are kept out unless indexing is switched on for launch. */
export function allowIndexing(): boolean {
  return process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";
}
