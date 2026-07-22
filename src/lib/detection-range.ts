import type { Product } from "@/types";
import { supportsDetectionRangeFilter } from "@/types";

/**
 * Compute min/max detection range for products in a category.
 * Returns null if category doesn't support the filter or has no data.
 */
export function getDetectionRangeBounds(
  products: Product[],
  categorySlug?: string | null
): { min: number; max: number } | null {
  if (!supportsDetectionRangeFilter(categorySlug)) return null;

  const values = products
    .filter(
      (p) =>
        p.published !== false &&
        (!categorySlug || p.categorySlug === categorySlug) &&
        p.detectionRangeM != null &&
        Number.isFinite(p.detectionRangeM) &&
        (p.detectionRangeM as number) > 0
    )
    .map((p) => Number(p.detectionRangeM));

  if (!values.length) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (max <= min) {
    // single value — allow a tiny window so slider still works
    return { min, max: min + 1 };
  }
  return { min, max };
}

/** Realistic default detection range (m) when not set explicitly */
export function estimateDetectionRangeM(input: {
  resolution?: string | null;
  deviceType?: string | null;
  categorySlug?: string | null;
  id?: string;
}): number {
  const res = (input.resolution || "").replace("×", "x");
  const type = input.deviceType || "mono";
  const cat = input.categorySlug || "";
  const salt = (input.id || "0")
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);

  // Night vision (image intensifier) — shorter typical ranges
  if (cat === "pnb" || cat === "pricili-pnb") {
    const base = type === "scope" ? 380 : 320;
    return base + (salt % 180); // ~320–560
  }

  if (res.startsWith("640") || res.startsWith("1024")) {
    const base = type === "scope" ? 2100 : type === "binocular" ? 2000 : 1800;
    return base + (salt % 400); // ~1800–2500
  }
  if (res.startsWith("384") || res.startsWith("336")) {
    const base = type === "scope" ? 1400 : type === "binocular" ? 1300 : 1100;
    return base + (salt % 350); // ~1100–1750
  }
  if (res.startsWith("256") || res.startsWith("160")) {
    const base = type === "scope" ? 900 : 700;
    return base + (salt % 250); // ~700–1150
  }

  // fallback thermal
  return 1000 + (salt % 300);
}
