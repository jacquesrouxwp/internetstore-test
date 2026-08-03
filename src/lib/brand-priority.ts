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

export function sortBrandsByPriority(brands: Brand[]): Brand[] {
  const rank = new Map(PRIORITY_BRAND_SLUGS.map((slug, i) => [slug, i]));
  return [...brands].sort((a, b) => {
    const ra = rank.has(a.slug) ? rank.get(a.slug)! : PRIORITY_BRAND_SLUGS.length;
    const rb = rank.has(b.slug) ? rank.get(b.slug)! : PRIORITY_BRAND_SLUGS.length;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
}
