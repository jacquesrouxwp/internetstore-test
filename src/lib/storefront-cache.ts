import { revalidatePath, revalidateTag } from "next/cache";

/**
 * How long storefront data stays cached when nothing changes. Before
 * October 2026 the shared reads (brand menu, categories, settings, brand
 * pages) lived 60–120 s and product pages none at all; with bots crawling all
 * day that re-read the catalogue so often the Supabase free plan ran out of
 * egress (7 GB of 5 GB, 83 % database reads). Edits in the admin purge the
 * cache straight away (withStorefrontPurge), so long-lived is safe.
 */
export const STOREFRONT_TTL = 3600;

const TAGS = ["products", "brands", "categories", "category-brands", "store-settings", "catalog"];

/** Drop every cached storefront page and read — call after any catalogue edit. */
export function purgeStorefrontCache(): void {
  for (const t of TAGS) revalidateTag(t);
  revalidatePath("/", "layout");
}

type Handler<A extends unknown[]> = (...args: A) => Promise<Response>;

/** Wraps an admin write handler: on success the storefront shows the change at once. */
export function withStorefrontPurge<A extends unknown[]>(handler: Handler<A>): Handler<A> {
  return async (...args: A) => {
    const res = await handler(...args);
    if (res.status < 400) {
      try {
        purgeStorefrontCache();
      } catch (e) {
        console.error("[storefront-cache] purge failed", e);
      }
    }
    return res;
  };
}
