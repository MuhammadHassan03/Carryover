import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

// Update LAST_CONTENT_CHANGE when the page content really changes (Google ignores lastmod that is always "now").
const LAST_CONTENT_CHANGE = "2026-11-02";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, lastModified: LAST_CONTENT_CHANGE }];
}
