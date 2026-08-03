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
  "rix",
  "conotech",
  "konus",
  "seek",
];

export function visibleBrandGridBrands(brands: Brand[]): Brand[] {
  const hidden = new Set(HIDDEN_FROM_BRAND_GRID);
  return brands.filter((b) => !hidden.has(b.slug));
}

export function sortBrandsByPriority(brands: Brand[]): Brand[] {
  const rank = new Map(PRIORITY_BRAND_SLUGS.map((slug, i) => [slug, i]));
  return [...brands].sort((a, b) => {
    const ra = rank.has(a.slug) ? rank.get(a.slug)! : PRIORITY_BRAND_SLUGS.length;
    const rb = rank.has(b.slug) ? rank.get(b.slug)! : PRIORITY_BRAND_SLUGS.length;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}
