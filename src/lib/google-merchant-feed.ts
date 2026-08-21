/**
 * Google Merchant Center product feed (RSS 2.0 + xmlns:g).
 * Pure data + XML — no React.
 */

import { SEED_PRODUCTS } from "@/data/seed";
import {
  createServiceClient,
  hasServiceSupabase,
  hasPublicSupabase,
} from "@/lib/supabase/service";
import { mapDbProduct } from "@/lib/supabase/mappers";
import { absoluteProductImageUrls } from "@/lib/product-image-alt";
import { productJsonLdDescription } from "@/lib/product-json-ld";
import { isBrandHidden } from "@/lib/brand-priority";
import { getSiteUrl } from "@/lib/site-url";
import {
  productName,
  type Product,
} from "@/types";

export type MerchantLocale = "uk" | "ru";

/** Google taxonomy numeric IDs (Cameras & Optics > …). */
const GPC = {
  optics: "149",
  binoculars: "150",
  monoculars: "151",
  nightVision: "152",
} as const;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractGtin(specs: Record<string, string> | undefined): string | undefined {
  if (!specs) return undefined;
  for (const [k, v] of Object.entries(specs)) {
    if (!v || !String(v).trim()) continue;
    if (/^(gtin|gtin8|gtin12|gtin13|gtin14|ean|upc|barcode|штрих.?код)/i.test(k)) {
      const digits = String(v).replace(/\D/g, "");
      if (digits.length >= 8 && digits.length <= 14) return digits;
    }
  }
  return undefined;
}

function googleProductCategory(p: Product): string {
  const cat = (p.categorySlug || "").toLowerCase();
  const device = (p.deviceType || "").toLowerCase();
  if (cat.includes("pnb") || cat.includes("night")) return GPC.nightVision;
  if (device === "binocular" || cat.includes("binoc")) return GPC.binoculars;
  if (device === "mono" || cat.includes("teploviz")) return GPC.monoculars;
  if (device === "scope" || device === "clipon" || cat.includes("pricil"))
    return GPC.nightVision;
  return GPC.optics;
}

function productType(p: Product, locale: MerchantLocale): string {
  const slug = p.categorySlug || "";
  const mapUk: Record<string, string> = {
    teplovizori: "Тепловізори",
    pricili: "Приціли",
    pnb: "ПНБ",
    aksessuary: "Аксесуари",
  };
  const mapRu: Record<string, string> = {
    teplovizori: "Тепловизоры",
    pricili: "Прицелы",
    pnb: "ПНВ",
    aksessuary: "Аксессуары",
  };
  const mapped = (locale === "ru" ? mapRu : mapUk)[slug];
  if (mapped) return mapped;
  if (p.deviceType === "scope")
    return locale === "ru" ? "Тепловизионные прицелы" : "Тепловізійні приціли";
  if (p.deviceType === "binocular")
    return locale === "ru" ? "Тепловизионные бинокли" : "Тепловізійні біноклі";
  if (p.deviceType === "mono")
    return locale === "ru" ? "Тепловизоры" : "Тепловізори";
  return locale === "ru" ? "Оптика" : "Оптика";
}

function formatPriceUah(price: number): string {
  const n = Number.isFinite(price) ? Math.max(0, price) : 0;
  return `${n.toFixed(2)} UAH`;
}

function itemId(p: Product): string {
  const sku = (p.sku && String(p.sku).trim()) || "";
  // Prefer stable SKU; fall back to slug (unique)
  return (sku || p.slug).slice(0, 50);
}

export function productToMerchantFields(
  p: Product,
  locale: MerchantLocale,
  siteUrl: string
): Record<string, string> | null {
  if (p.published === false) return null;
  if (isBrandHidden(p.brandSlug) || isBrandHidden(p.brandName)) return null;

  const images = absoluteProductImageUrls(p.images || [], siteUrl);
  if (!images.length) return null; // image_link required

  const title = productName(p, locale).trim();
  if (!title) return null;

  const brand =
    (p.brandName && p.brandName.trim()) ||
    (p.brandSlug && p.brandSlug.trim()) ||
    "";
  if (!brand) return null; // brand required

  const path =
    locale === "ru" ? `/ru/product/${p.slug}` : `/product/${p.slug}`;
  const link = `${siteUrl.replace(/\/$/, "")}${path}`;

  let description = stripTags(productJsonLdDescription(p, locale));
  if (description.length > 5000) description = description.slice(0, 4997) + "...";
  if (!description) description = title;

  const gtin = extractGtin(p.specs);
  const mpn = (p.sku && String(p.sku).trim()) || p.slug;

  const fields: Record<string, string> = {
    id: itemId(p),
    title: title.slice(0, 150),
    description,
    link,
    image_link: images[0],
    availability: p.stock > 0 ? "in_stock" : "out_of_stock",
    price: formatPriceUah(Number(p.price) || 0),
    brand: brand.slice(0, 70),
    condition: "new",
    google_product_category: googleProductCategory(p),
    product_type: productType(p, locale),
  };

  if (images[1]) fields.additional_image_link = images.slice(1, 11).join(",");

  if (gtin) {
    fields.gtin = gtin;
  } else {
    fields.mpn = mpn.slice(0, 70);
    fields.identifier_exists = "no";
  }

  return fields;
}

function renderItem(fields: Record<string, string>): string {
  const lines = ["    <item>"];
  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue;
    // additional_image_link may be comma-separated → multiple tags
    if (key === "additional_image_link" && value.includes(",")) {
      for (const url of value.split(",")) {
        const u = url.trim();
        if (u)
          lines.push(
            `      <g:additional_image_link>${escapeXml(u)}</g:additional_image_link>`
          );
      }
      continue;
    }
    lines.push(`      <g:${key}>${escapeXml(value)}</g:${key}>`);
  }
  lines.push("    </item>");
  return lines.join("\n");
}

/** Serialize RSS 2.0 Merchant feed — no HTML/script. */
export function renderGoogleMerchantXml(
  products: Product[],
  opts: { locale: MerchantLocale; siteUrl: string }
): string {
  const { locale, siteUrl } = opts;
  const base = siteUrl.replace(/\/$/, "");
  const items: string[] = [];
  for (const p of products) {
    const fields = productToMerchantFields(p, locale, base);
    if (!fields) continue;
    items.push(renderItem(fields));
  }

  const channelTitle =
    locale === "ru"
      ? "Pro-Optics — профессиональная оптика"
      : "Pro-Optics — професійна оптика";
  const channelDesc =
    locale === "ru"
      ? "Каталог тепловизоров, прицелов и ПНВ. Доставка по Украине."
      : "Каталог тепловізорів, прицілів і ПНБ. Доставка по Україні.";

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">\n' +
    "  <channel>\n" +
    `    <title>${escapeXml(channelTitle)}</title>\n` +
    `    <link>${escapeXml(base)}</link>\n` +
    `    <description>${escapeXml(channelDesc)}</description>\n` +
    items.join("\n") +
    (items.length ? "\n" : "") +
    "  </channel>\n" +
    "</rss>\n"
  );
}

async function fetchAllPublishedProductsFull(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (t: string) => any }
): Promise<Product[]> {
  const pageSize = 1000;
  const all: Product[] = [];
  let from = 0;
  const select =
    "id, slug, sku, name_uk, name_ru, description_uk, description_ru, short_uk, short_ru, price, old_price, stock, brand_id, category_id, resolution, device_type, detection_range_m, rating, reviews_count, is_hit, is_new, is_top, is_sale, images, image_alts, specs, published, created_at, brands(slug, name), categories(slug)";

  for (;;) {
    const { data, error } = await supabase
      .from("products")
      .select(select)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      all.push(mapDbProduct(row as Record<string, unknown>));
    }
    if (data.length < pageSize) break;
    from += pageSize;
    if (from > 50000) break;
  }
  return all;
}

export async function loadMerchantProducts(): Promise<Product[]> {
  try {
    if (hasServiceSupabase()) {
      const supabase = createServiceClient();
      const list = await fetchAllPublishedProductsFull(supabase);
      if (list.length) return list;
    }
  } catch (e) {
    console.error("[merchant-feed] service", e);
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
        const list = await fetchAllPublishedProductsFull(supabase);
        if (list.length) return list;
      }
    } catch (e) {
      console.error("[merchant-feed] public", e);
    }
  }
  return SEED_PRODUCTS.filter((p) => p.published !== false);
}

export async function buildGoogleMerchantXml(
  locale: MerchantLocale = "uk"
): Promise<string> {
  const siteUrl = getSiteUrl();
  const products = await loadMerchantProducts();
  return renderGoogleMerchantXml(products, { locale, siteUrl });
}

export function forcePureMerchantXml(xml: string): string {
  let out = String(xml ?? "");
  out = out
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<script\b[^>]*\/>/gi, "")
    .replace(/<!DOCTYPE[\s\S]*?>/gi, "")
    .replace(/<\/?html\b[^>]*>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  out = out.trim();
  if (!out.startsWith("<?xml")) {
    out = '<?xml version="1.0" encoding="UTF-8"?>\n' + out;
  }
  if (!out.endsWith("\n")) out += "\n";
  return out;
}
