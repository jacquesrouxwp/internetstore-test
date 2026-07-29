import type { Product } from "@/types";
import { getCatalog } from "@/lib/catalog";
import { getRuntimeProducts } from "@/data/seed";
import { hasPublicSupabase } from "@/lib/supabase/service";
import {
  toCompareOption,
  type ThermalCompareOption,
} from "@/lib/thermal/parse-product-thermal";

function isThermalCandidate(p: Product): boolean {
  if (!p.published) return false;
  if (p.deviceType === "clipon") return false;
  const cat = p.categorySlug || "";
  if (/teploviz|thermal|pricil|mono|binokl|приціл/i.test(cat)) return true;
  if (p.resolution) return true;
  if (p.detectionRangeM != null && p.detectionRangeM > 0) return true;
  return false;
}

function productToOption(
  p: Product,
  locale: string
): ThermalCompareOption {
  const name = locale === "ru" ? p.nameRu || p.nameUk : p.nameUk || p.nameRu;
  return toCompareOption({
    id: p.id,
    slug: p.slug,
    name,
    resolution: p.resolution,
    detectionRangeM: p.detectionRangeM,
    specs: p.specs,
  });
}

/**
 * Published thermal products for comparison dropdown.
 * Prefer catalog/DB; fall back to seed when no Supabase.
 */
export async function listThermalCompareOptions(
  locale: string = "uk",
  excludeId?: string
): Promise<ThermalCompareOption[]> {
  let products: Product[] = [];

  try {
    const result = await getCatalog({ limit: 100, sort: "rating" });
    products = result.products || [];
  } catch {
    products = [];
  }

  if (!products.length && !hasPublicSupabase()) {
    products = getRuntimeProducts().filter((p) => p.published);
  }

  return products
    .filter(isThermalCandidate)
    .filter((p) => !excludeId || p.id !== excludeId)
    .map((p) => productToOption(p, locale))
    .sort((a, b) => a.name.localeCompare(b.name, locale === "ru" ? "ru" : "uk"));
}
