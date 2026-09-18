/**
 * Pure helpers for crawlable catalog pagination and its canonical URLs.
 */

type Query = Record<string, string | string[] | undefined>;

/**
 * Link to page `p`, keeping every active filter. Page 1 carries no `page`
 * param so it resolves to the same URL as the unpaginated listing.
 */
export function paginationHref(basePath: string, query: Query, p: number): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "page" || value == null) continue;
    for (const one of Array.isArray(value) ? value : [value]) {
      if (one !== "") params.append(key, one);
    }
  }
  if (p > 1) params.set("page", String(p));
  const qs = params.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Page numbers to render: first, last, current ±1, with -1 as an ellipsis. */
export function paginationItems(page: number, pages: number): number[] {
  const items: number[] = [];
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - page) <= 1) items.push(i);
    else if (items[items.length - 1] !== -1) items.push(-1);
  }
  return items;
}

/** Params that re-slice a listing into a facet rather than a page of it. */
const FACET_PARAMS = ["brand", "res", "type", "min", "max", "rmin", "rmax", "q", "sort", "limit"];

/** Page number from search params, clamped to a positive integer. */
export function pageFromQuery(query: Query): number {
  const raw = Array.isArray(query.page) ? query.page[0] : query.page;
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 1 ? n : 1;
}

/**
 * Canonical path for a category listing.
 *
 * Plain pages of the sequence are canonical to themselves (`?page=3`) — Google
 * explicitly advises against pointing every page at page 1, which would stop
 * the products listed deeper from being crawled. Filtered or re-sorted views
 * are facets of the same listing, so they fold back into the base URL.
 */
export function catalogCanonicalPath(basePath: string, query: Query): string {
  const faceted = FACET_PARAMS.some((k) => {
    const v = query[k];
    return Array.isArray(v) ? v.some((x) => x !== "") : v != null && v !== "";
  });
  if (faceted) return basePath;
  const page = pageFromQuery(query);
  return page > 1 ? `${basePath}?page=${page}` : basePath;
}

function paramList(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function numParam(v: string | string[] | undefined): number | undefined {
  const raw = Array.isArray(v) ? v[0] : v;
  return raw != null && raw !== "" ? Number(raw) : undefined;
}

/** Sidebar/toolbar query params → catalog filters (shared by listings). */
export function catalogFiltersFromQuery(query: Query) {
  return {
    brands: paramList(query.brand),
    resolutions: paramList(query.res),
    deviceType: typeof query.type === "string" ? query.type : "all",
    priceMin: numParam(query.min),
    priceMax: numParam(query.max),
    rangeMin: numParam(query.rmin),
    rangeMax: numParam(query.rmax),
    q: typeof query.q === "string" ? query.q : undefined,
    sort: typeof query.sort === "string" ? query.sort : "default",
    page: Number(query.page || 1),
    limit: Number(query.limit || 12),
  };
}
