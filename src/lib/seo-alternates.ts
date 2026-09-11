/**
 * Canonical + hreflang for localized storefront pages.
 *
 * Every localized page must set its own alternates through this helper. The
 * root layout used to supply `alternates.canonical = siteUrl`, and Next.js
 * merges metadata down the tree — so every page that did not override it
 * (categories, delivery, warranty, contacts, blog, the /ru homepage…)
 * shipped `<link rel="canonical" href="https://pro-optics.com.ua">`, telling
 * Google "I am a duplicate of the homepage, index that instead". Category
 * pages were asking to be dropped from the index.
 *
 * hreflang: each page exists as uk (unprefixed) and ru (/ru prefix). Without
 * alternates the two read as duplicates competing with each other; with them
 * Google serves the right language to the right searcher. Region is pinned to
 * UA so the Russian copy targets Ukrainian Russian-speakers rather than
 * competing for searches from elsewhere.
 */

import { absoluteUrl } from "./site-url";

export type SiteLocale = "uk" | "ru";

/** Locale-prefixed path: uk is unprefixed, ru lives under /ru. */
export function localizedPath(locale: string, path: string): string {
  const clean =
    !path || path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  if (locale === "ru") return clean ? `/ru${clean}` : "/ru";
  return clean || "/";
}

/**
 * Self-referential canonical plus uk/ru hreflang (and x-default → uk).
 * `path` is the locale-agnostic path, e.g. "/", "/catalog/teplovizori".
 */
export function pageAlternates(locale: string, path: string) {
  return {
    canonical: absoluteUrl(localizedPath(locale, path)),
    languages: {
      "uk-UA": absoluteUrl(localizedPath("uk", path)),
      "ru-UA": absoluteUrl(localizedPath("ru", path)),
      "x-default": absoluteUrl(localizedPath("uk", path)),
    },
  };
}
