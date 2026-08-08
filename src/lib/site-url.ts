/**
 * Canonical public origin for the storefront.
 * Always prefer NEXT_PUBLIC_SITE_URL; never fall back to a Vercel preview host.
 */

export const CANONICAL_SITE_ORIGIN = "https://pro-optics.com.ua";

/** Legacy deploy host — 301 to the canonical domain. */
export const LEGACY_VERCEL_HOST = "optics-shop-skeleton.vercel.app";

/**
 * Absolute site origin without trailing slash.
 * Safe on server and client (NEXT_PUBLIC_*).
 */
export function getSiteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL || "").trim();
  if (raw) {
    try {
      const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
      // Guard: never treat a vercel.app URL as canonical even if mis-set in env
      if (
        u.hostname.endsWith(".vercel.app") ||
        u.hostname === LEGACY_VERCEL_HOST
      ) {
        return CANONICAL_SITE_ORIGIN;
      }
      return u.origin;
    } catch {
      /* fall through */
    }
  }
  return CANONICAL_SITE_ORIGIN;
}

/** Absolute URL for a path (path may be "" or "/product/x"). */
export function absoluteUrl(path = ""): string {
  const base = getSiteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
