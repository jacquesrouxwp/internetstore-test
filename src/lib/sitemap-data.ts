/**
 * Data for /sitemap.xml — pure data + XML string builders.
 * Includes Google image sitemap tags for published products.
 * No React components. Prefer service-role client (no cookies/HTML).
 */

import { SEED_PRODUCTS, SEED_CATEGORIES } from "@/data/seed";
import {
  createServiceClient,
  hasServiceSupabase,
  hasPublicSupabase,
} from "@/lib/supabase/service";
import { absoluteProductImageUrls } from "@/lib/product-image-alt";

export type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: number;
  /** Absolute image URLs for Google image sitemap (product pages). */
  images?: string[];
};

type ProductRow = {
  slug: string;
  lastModified?: Date;
  images: string[];
};

type SlugRow = { slug: string; lastModified?: Date };

function parseImagesField(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      /* ignore */
    }
  }
  return [];
}

async function loadCategorySlugs(): Promise<SlugRow[]> {
  try {
    // Service role only — avoids cookie/server client (no HTML path)
    if (hasServiceSupabase()) {
      const supabase = createServiceClient();
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
  // Public anon client only if service missing (still no React)
  if (hasPublicSupabase()) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const url =
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        "";
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      if (url && key) {
        const supabase = createClient(url, key);
        const { data } = await supabase.from("categories").select("slug");
        if (data?.length) {
          return data
            .map((r) => ({ slug: String((r as { slug: string }).slug) }))
            .filter((e) => e.slug);
        }
      }
    } catch (e) {
      console.error("[sitemap] categories public", e);
    }
  }
  return SEED_CATEGORIES.map((c) => ({ slug: c.slug }));
}

function mapProductRows(
  data: unknown[],
  siteUrl: string
): ProductRow[] {
  return data
    .map((r) => {
      const row = r as {
        slug?: string;
        updated_at?: string;
        created_at?: string;
        images?: unknown;
      };
      const slug = String(row.slug || "");
      if (!slug) return null;
      const ts = row.updated_at || row.created_at;
      return {
        slug,
        lastModified: ts ? new Date(ts) : undefined,
        images: absoluteProductImageUrls(parseImagesField(row.images), siteUrl),
      };
    })
    .filter(Boolean) as ProductRow[];
}

/** Supabase returns max 1000 rows per request — page through all published products. */
async function fetchAllPublishedProducts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (t: string) => any }
): Promise<unknown[]> {
  const pageSize = 1000;
  const all: unknown[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("products")
      .select("slug, updated_at, created_at, images")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
    // Safety cap (~50k products)
    if (from > 50000) break;
  }
  return all;
}

async function loadProductEntries(siteUrl: string): Promise<ProductRow[]> {
  try {
    if (hasServiceSupabase()) {
      const supabase = createServiceClient();
      const data = await fetchAllPublishedProducts(supabase);
      if (data.length) {
        return mapProductRows(data, siteUrl);
      }
    }
  } catch (e) {
    console.error("[sitemap] products", e);
  }
  if (hasPublicSupabase()) {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      const url =
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        process.env.SUPABASE_URL ||
        "";
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
      if (url && key) {
        const supabase = createClient(url, key);
        const data = await fetchAllPublishedProducts(supabase);
        if (data.length) {
          return mapProductRows(data, siteUrl);
        }
      }
    } catch (e) {
      console.error("[sitemap] products public", e);
    }
  }
  return SEED_PRODUCTS.filter((p) => p.published !== false).map((p) => ({
    slug: p.slug,
    lastModified: new Date(p.createdAt),
    images: absoluteProductImageUrls(p.images || [], siteUrl),
  }));
}

function iso(d: Date): string {
  return d.toISOString();
}

/** Build flat entry list for the canonical site origin. */
export async function buildSitemapEntries(
  base: string
): Promise<SitemapEntry[]> {
  const now = new Date();
  const nowIso = iso(now);
  const out: SitemapEntry[] = [];

  const push = (
    path: string,
    opts: {
      lastmod?: string;
      changefreq?: SitemapEntry["changefreq"];
      priority?: number;
      images?: string[];
    } = {}
  ) => {
    out.push({
      loc: path ? `${base}${path.startsWith("/") ? path : `/${path}`}` : base,
      lastmod: opts.lastmod || nowIso,
      changefreq: opts.changefreq || "weekly",
      priority: opts.priority ?? 0.5,
      images: opts.images?.length ? opts.images : undefined,
    });
  };

  const staticPaths = [
    "",
    "/about",
    "/delivery",
    "/warranty",
    "/returns",
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
    loadProductEntries(base),
  ]);

  for (const c of cats) {
    push(`/catalog/${c.slug}`, { changefreq: "daily", priority: 0.8 });
    push(`/ru/catalog/${c.slug}`, { changefreq: "daily", priority: 0.7 });
  }

  for (const p of products) {
    const lm = p.lastModified ? iso(p.lastModified) : nowIso;
    const images = p.images?.length ? p.images : undefined;
    push(`/product/${p.slug}`, {
      lastmod: lm,
      changefreq: "weekly",
      priority: 0.7,
      images,
    });
    push(`/ru/product/${p.slug}`, {
      lastmod: lm,
      changefreq: "weekly",
      priority: 0.6,
      images,
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
 * Includes Google image sitemap namespace when any entry has images.
 * Never injects HTML, script, or comments.
 */
export function renderSitemapXml(entries: SitemapEntry[]): string {
  const hasImages = entries.some((e) => e.images && e.images.length > 0);

  const body = entries
    .map((e) => {
      // Sanitize loc: absolute URL only, no angle brackets
      const loc = escapeXml(e.loc.replace(/[<>]/g, ""));
      const parts = ["  <url>", `    <loc>${loc}</loc>`];
      if (e.lastmod) {
        const lm = escapeXml(String(e.lastmod).replace(/[<>]/g, ""));
        parts.push(`    <lastmod>${lm}</lastmod>`);
      }
      if (e.changefreq) {
        const cf = escapeXml(String(e.changefreq).replace(/[^a-z]/gi, ""));
        if (cf) parts.push(`    <changefreq>${cf}</changefreq>`);
      }
      if (e.priority != null && Number.isFinite(e.priority)) {
        parts.push(
          `    <priority>${Math.min(1, Math.max(0, Number(e.priority))).toFixed(1)}</priority>`
        );
      }
      if (e.images?.length) {
        for (const img of e.images) {
          const abs = String(img || "").trim();
          if (!abs || !/^https?:\/\//i.test(abs)) continue;
          const safe = escapeXml(abs.replace(/[<>]/g, ""));
          parts.push("    <image:image>");
          parts.push(`      <image:loc>${safe}</image:loc>`);
          parts.push("    </image:image>");
        }
      }
      parts.push("  </url>");
      return parts.join("\n");
    })
    .join("\n");

  const ns = hasImages
    ? 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"'
    : 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<urlset ${ns}>\n` +
    body +
    "\n</urlset>\n"
  );
}
