import type { MetadataRoute } from "next";

import { allowIndexing } from "@/lib/security-headers";

/** Everything stays out of search engines until indexing is switched on; signed-in areas always do. */
export default function robots(): MetadataRoute.Robots {
  if (!allowIndexing()) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/parent", "/coach", "/admin", "/auth"] } };
}
