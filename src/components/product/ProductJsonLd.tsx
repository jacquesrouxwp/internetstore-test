import type { Product } from "@/types";
import type { DeliverySettings } from "@/lib/store-settings";
import { buildProductJsonLd } from "@/lib/product-json-ld";

/**
 * Schema.org Product JSON-LD for Google Product rich results.
 * Renders a single application/ld+json script — no layout side effects.
 */
export function ProductJsonLd({
  product,
  locale,
  siteUrl,
  delivery,
  realReviews = null,
}: {
  product: Product;
  locale: "uk" | "ru";
  siteUrl: string;
  delivery?: DeliverySettings | null;
  /** Pass only when backed by real customer reviews (not seed ratings). */
  realReviews?: { ratingValue: number; reviewCount: number } | null;
}) {
  const data = buildProductJsonLd({
    product,
    locale,
    siteUrl,
    delivery,
    realReviews,
  });

  // Prevent </script> breakouts in free-text fields
  const json = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
