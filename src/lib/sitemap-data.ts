/**
 * Data for /sitemap.xml — shared by the pure XML route handler.
 * No React / metadata pipeline — keeps the body free of HTML/script.
 */

import { SEED_PRODUCTS, SEED_CATEGORIES } from "@/data/seed";
import {
  createServiceClient,
  hasServiceSupabase,
  hasPublicSupabase,
} from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
};

type SlugRow = { slug: string; lastModified?: Date };

async function loadCategorySlugs(): Promise<SlugRow[]> {
  try {
    if (hasServiceSupabase()) {
      const supabase = createServiceClient();
      const { data } = await supabase.from("categories").select("slug");
      if (data?.length) {
        return data
          .map((r) => ({ slug: String((r as { slug: string }).slug) }))
          .filter((e) => e.slug);
      }
    }
    if (hasPublicSupabase()) {
      const supabase = await createClient();
      const { data } = await supabase.from("categories").select("slug");
      if (data?.length) {
        return data
          .map((r) => ({ slug: String((r as { slug: string }).slug) }))
          .filter((e) => e.slug);
      }
    }
  } catch (e) {
    console.error("[sitemap] categories", e);
  }
  return SEED_CATEGORIES.map((c) => ({ slug: c.slug }));
}

async function loadProductEntries(): Promise<SlugRow[]> {
  try {
    if (hasServiceSupabase()) {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("products")
        .select("slug, updated_at, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (data?.length) {
        return data
          .map((r) => {
            const row = r as {
              slug?: string;
              updated_at?: string;
              created_at?: string;
            };
            const slug = String(row.slug || "");
            if (!slug) return null;
            const ts = row.updated_at || row.created_at;
            return {
              slug,
              lastModified: ts ? new Date(ts) : undefined,
            };
          })
          .filter(Boolean) as SlugRow[];
      }
    }
    if (hasPublicSupabase()) {
      const supabase = await createClient();
      const { data } = await supabase
        .from("products")
        .select("slug, updated_at, created_at")
        .eq("published", true);
      if (data?.length) {
        return data
          .map((r) => {
            const row = r as {
              slug?: string;
              updated_at?: string;
              created_at?: string;
            };
            const slug = String(row.slug || "");
            if (!slug) return null;
            const ts = row.updated_at || row.created_at;
            return {
              slug,
              lastModified: ts ? new Date(ts) : undefined,
            };
          })
          .filter(Boolean) as SlugRow[];
      }
    }
  } catch (e) {
    console.error("[sitemap] products", e);
  }
  return SEED_PRODUCTS.map((p) => ({
    slug: p.slug,
    lastModified: new Date(p.createdAt),
  }));
}

function iso(d: Date): string {
  return d.toISOString();
}

/** Build flat entry list for the canonical site origin. */
export async function buildSitemapEntries(base: string): Promise<SitemapEntry[]> {
  const now = new Date();
  const nowIso = iso(now);
  const out: SitemapEntry[] = [];

  const push = (
    path: string,
    opts: {
      lastmod?: string;
      changefreq?: SitemapEntry["changefreq"];
      priority?: number;
    } = {}
  ) => {
    out.push({
      loc: path ? `${base}${path.startsWith("/") ? path : `/${path}`}` : base,
      lastmod: opts.lastmod || nowIso,
      changefreq: opts.changefreq || "weekly",
      priority: opts.priority ?? 0.5,
    });
  };

  const staticPaths = [
    "",
    "/about",
    "/delivery",
    "/warranty",
    "/contacts",
    "/blog",
  ];

  for (const path of staticPaths) {
    push(path, {
      changefreq: "weekly",
      priority: path === "" ? 1 : 0.6,
    });
    push(`/ru${path}`, {
      changefreq: "weekly",
      priority: path === "" ? 0.9 : 0.5,
    });
  }

  const [cats, products] = await Promise.all([
    loadCategorySlugs(),
    loadProductEntries(),
  ]);

  for (const c of cats) {
    push(`/catalog/${c.slug}`, { changefreq: "daily", priority: 0.8 });
    push(`/ru/catalog/${c.slug}`, { changefreq: "daily", priority: 0.7 });
  }

  for (const p of products) {
    const lm = p.lastModified ? iso(p.lastModified) : nowIso;
    push(`/product/${p.slug}`, {
      lastmod: lm,
      changefreq: "weekly",
      priority: 0.7,
    });
    push(`/ru/product/${p.slug}`, {
      lastmod: lm,
      changefreq: "weekly",
      priority: 0.6,
    });
  }

  return out;
}

/** Escape text for XML element body / attributes. */
export function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Serialize a pure urlset document — only urlset + url children.
 * Never injects HTML, script, or comments.
 */
export function renderSitemapXml(entries: SitemapEntry[]): string {
  const body = entries
    .map((e) => {
      const parts = [
        "  <url>",
        `    <loc>${escapeXml(e.loc)}</loc>`,
      ];
      if (e.lastmod) {
        parts.push(`    <lastmod>${escapeXml(e.lastmod)}</lastmod>`);
      }
      if (e.changefreq) {
        parts.push(
          `    <changefreq>${escapeXml(e.changefreq)}</changefreq>`
        );
      }
      if (e.priority != null) {
        parts.push(
          `    <priority>${Number(e.priority).toFixed(1)}</priority>`
        );
      }
      parts.push("  </url>");
      return parts.join("\n");
    })
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    body,
    "</urlset>",
    "",
  ].join("\n");
}
