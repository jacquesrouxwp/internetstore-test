import type { Product } from "@/types";
import { productName, productDescription } from "@/types";

export function ProductJsonLd({
  product,
  locale,
  siteUrl,
}: {
  product: Product;
  locale: "uk" | "ru";
  siteUrl: string;
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName(product, locale),
    description: productDescription(product, locale),
    sku: product.sku || product.slug,
    brand: product.brandName
      ? { "@type": "Brand", name: product.brandName }
      : undefined,
    image: product.images.length ? product.images : undefined,
    aggregateRating:
      product.reviewsCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewsCount,
          }
        : undefined,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/${locale === "uk" ? "" : "ru/"}product/${product.slug}`,
      priceCurrency: "UAH",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
