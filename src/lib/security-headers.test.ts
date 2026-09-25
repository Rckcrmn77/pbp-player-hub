import { afterEach, describe, expect, it, vi } from "vitest";

import { allowIndexing, contentSecurityPolicy, staticSecurityHeaders } from "./security-headers";

describe("contentSecurityPolicy", () => {
  it("allows only this site and nonce-bearing scripts in production", () => {
    const csp = contentSecurityPolicy("abc123", { https: true });
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("upgrade-insecure-requests");
  });

  it("adds eval only for local development, and no https upgrade over http", () => {
    const csp = contentSecurityPolicy("abc123", { dev: true });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain("upgrade-insecure-requests");
  });
});

describe("static headers and indexing", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("forbids framing and MIME sniffing", () => {
    const keys = Object.fromEntries(staticSecurityHeaders.map((h) => [h.key, h.value]));
    expect(keys["X-Frame-Options"]).toBe("DENY");
    expect(keys["X-Content-Type-Options"]).toBe("nosniff");
  });

  it("keeps search engines out unless switched on", () => {
    vi.stubEnv("NEXT_PUBLIC_ALLOW_INDEXING", "");
    expect(allowIndexing()).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_ALLOW_INDEXING", "true");
    expect(allowIndexing()).toBe(true);
  });
});
