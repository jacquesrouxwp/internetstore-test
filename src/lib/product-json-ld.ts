/**
 * Schema.org Product JSON-LD for Google rich results.
 * Pure builder — no React. Safe to unit-test.
 */

import type { Product } from "@/types";
import {
  productName,
  productDescription,
  productShort,
} from "@/types";
import type { DeliverySettings } from "@/lib/store-settings";
import { absoluteUrl } from "@/lib/site-url";
import { absoluteProductImageUrls } from "@/lib/product-image-alt";

export type ProductJsonLdInput = {
  product: Product;
  locale: "uk" | "ru";
  siteUrl: string;
  delivery?: DeliverySettings | null;
  /**
   * Only pass when you have real customer reviews backed by content.
   * Seed/marketing rating fields alone must NOT produce AggregateRating.
   */
  realReviews?: { ratingValue: number; reviewCount: number } | null;
};

const MIN_DESC = 50;

/** Build a non-empty description of usable length for Product rich results. */
export function productJsonLdDescription(
  product: Product,
  locale: "uk" | "ru"
): string {
  const full = (productDescription(product, locale) || "").replace(/\s+/g, " ").trim();
  const short = (productShort(product, locale) || "").replace(/\s+/g, " ").trim();
  const name = productName(product, locale);
  const brand = product.brandName || product.brandSlug || "";

  let desc = full || short;
  if (desc.length < MIN_DESC) {
    const extras: string[] = [];
    if (brand) extras.push(brand);
    if (product.resolution) extras.push(String(product.resolution));
    if (product.detectionRangeM)
      extras.push(
        locale === "ru"
          ? `дальность обнаружения ~${product.detectionRangeM} м`
          : `дальність виявлення ~${product.detectionRangeM} м`
      );
    const tail =
      locale === "ru"
        ? "Профессиональная оптика. Доставка Новой Почтой по Украине."
        : "Професійна оптика. Доставка Новою Поштою по Україні.";
    desc = [desc || name, extras.join(", "), tail].filter(Boolean).join(". ");
  }
  // Cap for JSON-LD (Google reads ~5k; keep readable)
  // Military discount lives only on /about — do not boilerplate into product descriptions.
  if (desc.length > 5000) desc = desc.slice(0, 4997) + "...";
  return desc.replace(/\s+/g, " ").trim();
}

function productImages(product: Product, siteUrl: string): string[] {
  const list = absoluteProductImageUrls(product.images || [], siteUrl);
  // Google wants at least one image when possible
  if (!list.length) {
    list.push(`${siteUrl.replace(/\/$/, "")}/favicon.ico`);
  }
  return list;
}

function extractGtin(specs: Record<string, string> | undefined): string | undefined {
  if (!specs) return undefined;
  for (const [k, v] of Object.entries(specs)) {
    if (!v || !String(v).trim()) continue;
    if (/^(gtin|gtin8|gtin12|gtin13|gtin14|ean|upc|barcode|штрих.?код)/i.test(k)) {
      const digits = String(v).replace(/\D/g, "");
      if (digits.length >= 8 && digits.length <= 14) return digits;
    }
  }
  return undefined;
}

function extractMpn(
  product: Product,
  specs: Record<string, string> | undefined
): string | undefined {
  if (product.sku && String(product.sku).trim()) return String(product.sku).trim();
  if (!specs) return undefined;
  for (const [k, v] of Object.entries(specs)) {
    if (/^(mpn|model|модель|артикул|sku)$/i.test(k) && v?.trim()) {
      return String(v).trim();
    }
  }
  return product.slug || undefined;
}

/**
 * Build a JSON-serializable Product graph for <script type="application/ld+json">.
 */
export function buildProductJsonLd(input: ProductJsonLdInput): Record<string, unknown> {
  const { product, locale, siteUrl, delivery, realReviews } = input;
  const name = productName(product, locale);
  const description = productJsonLdDescription(product, locale);
  const brandName =
    (product.brandName && product.brandName.trim()) ||
    (product.brandSlug && product.brandSlug.trim()) ||
    "Pro-Optics";

  const path =
    locale === "ru"
      ? `/ru/product/${product.slug}`
      : `/product/${product.slug}`;
  const productUrl = absoluteUrl(path);
  const images = productImages(product, siteUrl);
  const sku = (product.sku && String(product.sku).trim()) || product.slug;
  const mpn = extractMpn(product, product.specs);
  const gtin = extractGtin(product.specs);

  const shippingCost =
    delivery && Number.isFinite(delivery.defaultCost)
      ? Math.max(0, Number(delivery.defaultCost))
      : 0;
  const freeFrom =
    delivery && Number.isFinite(delivery.freeFrom)
      ? Math.max(0, Number(delivery.freeFrom))
      : 0;
  // freeFrom > 0 → free when cart/item price meets threshold; else use defaultCost
  const effectiveShipping =
    freeFrom > 0 && product.price >= freeFrom ? 0 : shippingCost;

  const shippingLabel =
    (delivery?.note && delivery.note.trim()) ||
    (locale === "ru" ? "Новая Почта по Украине" : "Нова Пошта по Україні");

  // priceValidUntil: ~1 year ahead (required by some Merchant Listings paths)
  const validUntil = new Date();
  validUntil.setFullYear(validUntil.getFullYear() + 1);
  const priceValidUntil = validUntil.toISOString().slice(0, 10);

  const offers: Record<string, unknown> = {
    "@type": "Offer",
    url: productUrl,
    priceCurrency: "UAH",
    price: Number(product.price) || 0,
    priceValidUntil,
    availability:
      product.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: {
      "@type": "Organization",
      name: "Pro-Optics",
      url: siteUrl.replace(/\/$/, ""),
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "UA",
      returnPolicyCategory:
        "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 14,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/ReturnShippingFees",
      // Domestic UA returns via Nova Poshta — policy page /returns
      merchantReturnLink: absoluteUrl(
        locale === "ru" ? "/ru/returns" : "/returns"
      ),
    },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingLabel,
      shippingRate: {
        "@type": "MonetaryAmount",
        value: String(effectiveShipping),
        currency: "UAH",
      },
      shippingDestination: {
        "@type": "DefinedRegion",
        addressCountry: "UA",
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: 0,
          maxValue: 2,
          unitCode: "DAY",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: 1,
          maxValue: 3,
          unitCode: "DAY",
        },
      },
    },
  };

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    image: images.length === 1 ? images[0] : images,
    brand: {
      "@type": "Brand",
      name: brandName,
    },
    sku,
    mpn: mpn || sku,
    offers,
  };

  if (gtin) {
    // Google accepts gtin, gtin8, gtin12, gtin13, gtin14
    const len = gtin.length;
    if (len === 8) data.gtin8 = gtin;
    else if (len === 12) data.gtin12 = gtin;
    else if (len === 13) data.gtin13 = gtin;
    else if (len === 14) data.gtin14 = gtin;
    else data.gtin = gtin;
  }

  // AggregateRating ONLY with real review evidence (not seed marketing counts)
  if (
    realReviews &&
    realReviews.reviewCount > 0 &&
    realReviews.ratingValue >= 1 &&
    realReviews.ratingValue <= 5
  ) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(realReviews.ratingValue.toFixed(1)),
      reviewCount: Math.floor(realReviews.reviewCount),
      bestRating: 5,
      worstRating: 1,
    };
  }

  return data;
}
