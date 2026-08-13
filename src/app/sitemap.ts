import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { buildSitemapEntries } from "@/lib/sitemap-data";

/**
 * Official Next.js Metadata sitemap → pure /sitemap.xml
 * (no React tree, no root layout, no <script> injection).
 */
export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const entries = await buildSitemapEntries(base);
  return entries.map((e) => ({
    url: e.loc,
    lastModified: e.lastmod ? new Date(e.lastmod) : new Date(),
    changeFrequency: e.changefreq,
    priority: e.priority,
  }));
}
