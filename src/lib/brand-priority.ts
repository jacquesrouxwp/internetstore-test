import type { Brand } from "@/types";

/**
 * Storefront brands the owner wants surfaced first everywhere a brand list
 * is shown to shoppers (sidebar filter, category hover menu, homepage brand
 * grid) -- admin-facing brand lists are unaffected, they stay alphabetical.
 */
export const PRIORITY_BRAND_SLUGS = [
  "agm",
  "hikmicro",
  "infiray",
  "pulsar",
  "thermtec",
  "pard",
  "guide",
];

/**
 * Brands kept out of the homepage brand-card grid only. They still appear in
 * the sidebar filter and the category hover menu, and their products are
 * unaffected — this is purely about which logos get a card on the homepage.
 */
export const HIDDEN_FROM_BRAND_GRID = [
  "dipol",
  "conotech",
  "konus",
  "seek",
];

/** Brands fully removed from storefront (products + brand chips). */
export const HIDDEN_BRAND_SLUGS = new Set(["rix"]);

export function isBrandHidden(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return HIDDEN_BRAND_SLUGS.has(slug);
}

export function filterHiddenBrands(brands: Brand[]): Brand[] {
  return brands.filter((b) => !isBrandHidden(b.slug));
}

export function filterHiddenBrandProducts<T extends { brandSlug?: string | null }>(
  products: T[]
): T[] {
  return products.filter((p) => !isBrandHidden(p.brandSlug));
}

export function visibleBrandGridBrands(brands: Brand[]): Brand[] {
  const hidden = new Set(HIDDEN_FROM_BRAND_GRID);
  return filterHiddenBrands(brands).filter((b) => !hidden.has(b.slug));
}

export function sortBrandsByPriority(brands: Brand[]): Brand[] {
  const rank = new Map(PRIORITY_BRAND_SLUGS.map((slug, i) => [slug, i]));
  return filterHiddenBrands([...brands]).sort((a, b) => {
    const ra = rank.has(a.slug) ? rank.get(a.slug)! : PRIORITY_BRAND_SLUGS.length;
    const rb = rank.has(b.slug) ? rank.get(b.slug)! : PRIORITY_BRAND_SLUGS.length;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}
