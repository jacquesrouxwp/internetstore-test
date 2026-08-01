import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { hasServiceSupabase } from "@/lib/supabase/service";
import {
  adminListBrands,
  adminListCategories,
  adminUpsertCategory,
  adminUpsertBrand,
  adminFindProductByBrandSku,
  adminUpsertProduct,
} from "@/lib/db/admin-repo";
import { mirrorImageToStorage } from "@/lib/admin/storage";
import { slugify } from "@/lib/utils";
import { SEED_BRANDS, SEED_CATEGORIES } from "@/data/seed";
import {
  DONOR_ROOT_PATHS,
  CATEGORY_ROOT_MAP,
  mapDonorCategory,
  matchBrand,
  matchBrandFromName,
} from "@/lib/import/optics-pro-categories";
import {
  discoverProductUrls,
  fetchDonorHtml,
  parseProductPage,
  mapWithConcurrency,
  imagesShareSameFolder,
  looksLikeMatchingGallery,
} from "@/lib/import/optics-pro-scraper";
import { buildProductRecord, type ImportRowResult } from "@/lib/import/optics-pro-pipeline";
import type { Product } from "@/types";

/**
 * Import from optics-pro.com.ua, stateless/resumable so it survives
 * serverless function time limits:
 *   action: "discover" -- crawl category listings, return the full
 *     {root,url} item list (client keeps it, slices into batches).
 *   action: "process" -- fetch+parse+map+upsert the given batch of items.
 *     dryRun:true skips DB writes/image downloads (preview only).
 */

async function ensureSeedCategoriesAndBrands() {
  for (const c of SEED_CATEGORIES) {
    await adminUpsertCategory(c, true).catch(() => {});
  }
  for (const b of SEED_BRANDS) {
    await adminUpsertBrand(b, true).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) {
    return NextResponse.json(
      { error: "Supabase service role not configured" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const action = body.action || "discover";

  if (action === "discover") {
    const roots: string[] =
      Array.isArray(body.roots) && body.roots.length
        ? body.roots
        : DONOR_ROOT_PATHS;
    const items: { root: string; url: string }[] = [];
    const byRoot: Record<string, number> = {};
    for (const root of roots) {
      if (!CATEGORY_ROOT_MAP[root]) continue;
      const urls = await discoverProductUrls(root);
      byRoot[root] = urls.length;
      for (const url of urls) items.push({ root, url });
    }
    return NextResponse.json({ total: items.length, byRoot, items });
  }

  if (action === "process") {
    const items: { root: string; url: string }[] = Array.isArray(body.items)
      ? body.items
      : [];
    const dryRun = Boolean(body.dryRun);
    const downloadImages = body.downloadImages !== false;
    if (!items.length) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }
    if (body.ensureSeed) await ensureSeedCategoriesAndBrands();

    const [brands, categories] = await Promise.all([
      adminListBrands(),
      adminListCategories(),
    ]);
    const catBySlug = new Map(categories.map((c) => [c.slug, c]));

    const results: ImportRowResult[] = await mapWithConcurrency(
      items,
      Math.min(6, items.length),
      async ({ url }) => {
        const fullUrl = `https://www.optics-pro.com.ua/${url}`;
        try {
          const html = await fetchDonorHtml(fullUrl);
          const parsed = parseProductPage(html, url);
          if (!parsed) {
            return { status: "skipped", url, reason: "no-product-jsonld" };
          }

          const catMap = mapDonorCategory(url);
          if (!catMap) {
            return {
              status: "skipped",
              url,
              reason: "category-not-whitelisted",
            };
          }
          const category = catBySlug.get(catMap.ourSlug);
          if (!category) {
            return {
              status: "skipped",
              url,
              reason: `our-category-missing:${catMap.ourSlug}`,
            };
          }

          const brand =
            matchBrand(parsed.brandName, brands) ||
            (!parsed.brandName
              ? matchBrandFromName(parsed.name, brands)
              : null);
          if (!brand) {
            return {
              status: "skipped",
              url,
              reason: `brand-not-whitelisted:${parsed.brandName || "?"}`,
            };
          }

          const skuOrModel = (parsed.sku || parsed.model || "").trim();
          const existing = skuOrModel
            ? await adminFindProductByBrandSku(brand.id, skuOrModel)
            : null;

          const folderOk = imagesShareSameFolder(parsed.images);
          let images = folderOk ? parsed.images : [];
          const imagesConsistent =
            folderOk && looksLikeMatchingGallery(images, url);

          if (!dryRun && downloadImages && images.length) {
            const key = `optics-pro-${brand.slug}-${slugify(skuOrModel || parsed.name).slice(0, 40)}`;
            const mirrored: string[] = [];
            for (let i = 0; i < images.length; i++) {
              mirrored.push(await mirrorImageToStorage(images[i], key, i));
            }
            images = mirrored;
          }

          const record = buildProductRecord(
            { ...parsed, images },
            brand,
            category,
            catMap.deviceType,
            existing
          );
          if (!imagesConsistent) {
            record.specs._imagesFlagged = folderOk
              ? "donor-gallery-may-include-sibling-model-photo-please-verify"
              : "donor-gallery-had-unrelated-brand-photos-dropped";
          }

          const fewSpecs = Object.keys(record.specs).filter((k) => !k.startsWith("_")).length < 8;
          const rowMeta = {
            url,
            name: record.nameUk,
            brandSlug: brand.slug,
            categorySlug: category.slug,
            price: record.price || null,
            imageCount: images.length,
            imagesConsistent,
            missingPrice: !parsed.price,
            fewSpecs,
          };

          if (dryRun) {
            return { status: existing ? "updated" : "created", ...rowMeta };
          }

          const fullProduct: Product = {
            ...record,
            id:
              record.id ||
              `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            rating: existing?.rating ?? 0,
            reviewsCount: existing?.reviewsCount ?? 0,
            createdAt: existing?.createdAt ?? new Date().toISOString(),
          };
          await adminUpsertProduct(fullProduct, !existing);

          return { status: existing ? "updated" : "created", ...rowMeta };
        } catch (e) {
          return {
            status: "skipped",
            url,
            reason: `error:${e instanceof Error ? e.message : String(e)}`,
          };
        }
      }
    );

    return NextResponse.json({ results });
  }

  return NextResponse.json(
    { error: `Unknown action "${action}"` },
    { status: 400 }
  );
}
