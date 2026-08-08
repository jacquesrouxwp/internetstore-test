import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { SEED_PRODUCTS, SEED_CATEGORIES } from "@/data/seed";
import {
  createServiceClient,
  hasServiceSupabase,
  hasPublicSupabase,
} from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

type Entry = { slug: string; lastModified?: Date };

async function loadCategorySlugs(): Promise<Entry[]> {
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

async function loadProductEntries(): Promise<Entry[]> {
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
          .filter(Boolean) as Entry[];
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
          .filter(Boolean) as Entry[];
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

/** Refresh product/category URLs hourly (SEO). */
export const revalidate = 3600;

/**
 * Pure MetadataRoute.Sitemap → Next emits application/xml urlset only
 * (no HTML/script wrappers). All <loc> use the canonical domain.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();

  const staticPaths = [
    "",
    "/about",
    "/delivery",
    "/warranty",
    "/contacts",
    "/blog",
  ];

  const staticPages: MetadataRoute.Sitemap = staticPaths.flatMap((path) => [
    {
      url: `${base}${path}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: path === "" ? 1 : 0.6,
    },
    {
      url: `${base}/ru${path}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: path === "" ? 0.9 : 0.5,
    },
  ]);

  const [cats, products] = await Promise.all([
    loadCategorySlugs(),
    loadProductEntries(),
  ]);

  const catPages: MetadataRoute.Sitemap = cats.flatMap((c) => [
    {
      url: `${base}/catalog/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/ru/catalog/${c.slug}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ]);

  const productPages: MetadataRoute.Sitemap = products.flatMap((p) => {
    const lm = p.lastModified || now;
    return [
      {
        url: `${base}/product/${p.slug}`,
        lastModified: lm,
        changeFrequency: "weekly",
        priority: 0.7,
      },
      {
        url: `${base}/ru/product/${p.slug}`,
        lastModified: lm,
        changeFrequency: "weekly",
        priority: 0.6,
      },
    ];
  });

  // Always valid even with 0 products (static + categories only)
  return [...staticPages, ...catPages, ...productPages];
}
