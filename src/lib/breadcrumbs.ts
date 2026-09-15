/**
 * Breadcrumb trail + schema.org BreadcrumbList.
 *
 * Product pages used to hardcode "Головна / Тепловізори / <product>" for every
 * item — night-vision devices and accessories included — and no page emitted a
 * BreadcrumbList. Google therefore got a wrong picture of the catalogue
 * structure, and search results showed the bare URL instead of a readable path.
 * Trails are now built from the item's real category and emitted as structured
 * data alongside the visible links.
 */

import { absoluteUrl } from "./site-url";
import { localizedPath } from "./seo-alternates";

/** One step of the trail; `path` is locale-agnostic ("/catalog/pnb"). */
export type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(locale: string, crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(localizedPath(locale, c.path)),
    })),
  };
}

/** JSON for an inline ld+json script, safe against `</script>` breakouts. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
