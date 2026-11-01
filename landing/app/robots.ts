import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// Everything is public. Search and AI answer crawlers (Googlebot, OAI-SearchBot,
// Claude-SearchBot, PerplexityBot) are allowed by the "*" rule.
// TODO(founder): training crawlers (GPTBot, ClaudeBot, Google-Extended, CCBot) are also
// allowed by default. Add disallow rules for them here if you prefer to opt out of training.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/" }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
