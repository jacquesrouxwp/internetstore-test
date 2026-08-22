export type Locale = "uk" | "ru";

export type DeviceType = "mono" | "scope" | "binocular" | "clipon";
export type Resolution =
  | "256x192"
  | "384x288"
  | "640x512"
  | "1024x768"
  | "160x120"
  | string;

export type ProductBadge = "hit" | "new" | "top" | "sale";

export interface Brand {
  id: string;
  slug: string;
  name: string;
  logoUrl?: string | null;
}

export interface Category {
  id: string;
  slug: string;
  nameUk: string;
  nameRu: string;
  descriptionUk?: string | null;
  descriptionRu?: string | null;
  parentId?: string | null;
  sortOrder?: number;
}

export interface Product {
  id: string;
  slug: string;
  sku?: string | null;
  nameUk: string;
  nameRu: string;
  descriptionUk?: string | null;
  descriptionRu?: string | null;
  shortUk?: string | null;
  shortRu?: string | null;
  price: number;
  oldPrice?: number | null;
  stock: number;
  brandId?: string | null;
  brandSlug?: string | null;
  brandName?: string | null;
  categoryId?: string | null;
  categorySlug?: string | null;
  resolution?: Resolution | null;
  deviceType?: DeviceType | null;
  /** Human detection range in meters */
  detectionRangeM?: number | null;
  rating: number;
  reviewsCount: number;
  isHit: boolean;
  isNew: boolean;
  isTop: boolean;
  isSale: boolean;
  images: string[];
  /** Parallel to images[] — alt text per photo */
  imageAlts?: string[];
  specs: Record<string, string>;
  published: boolean;
  createdAt: string;
  metaTitleUk?: string | null;
  metaTitleRu?: string | null;
  metaDescriptionUk?: string | null;
  metaDescriptionRu?: string | null;
  /** Filled when competitor price links exist */
  priceCompare?: import("@/lib/price-compare/types").PriceCompareSummary | null;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
}

/** Admin workflow: new → processing → shipped → done (+ cancelled, returned) */
export type OrderStatus =
  | "new"
  | "processing"
  | "shipped"
  | "done"
  | "cancelled"
  | "returned";

export type PaymentMethod = "cod" | "monobank" | "liqpay" | "wayforpay";

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  deliveryMethod: string;
  npCityRef?: string | null;
  npCityName?: string | null;
  npWarehouseRef?: string | null;
  npWarehouseName?: string | null;
  deliveryCost: number;
  subtotal: number;
  total: number;
  comment?: string | null;
  /** Internal note — not shown to customer */
  managerComment?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  statusNotifiedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  productId?: string | null;
  productName: string;
  productSlug?: string | null;
  price: number;
  quantity: number;
}

export interface Review {
  id: string;
  productName: string;
  author: string;
  text: string;
  rating: number;
  date: string;
}

export interface CatalogFilters {
  brands?: string[];
  resolutions?: string[];
  deviceType?: string;
  priceMin?: number;
  priceMax?: number;
  /** Detection range filter (meters) */
  rangeMin?: number;
  rangeMax?: number;
  q?: string;
  sort?: string;
  page?: number;
  limit?: number;
  flags?: string[]; // hit | new | top | sale
}

export interface CatalogResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  brands: Brand[];
  categories: Category[];
  /** Bounds for detection-range slider within current category */
  detectionRangeBounds?: { min: number; max: number } | null;
}

/** Categories that show the human detection-range slider */
export const DETECTION_RANGE_CATEGORY_SLUGS = [
  "teplovizori",
  "pricili",
  "pricili-pnb",
  "binokli",
  "pnb",
] as const;

export type DetectionRangeCategorySlug =
  (typeof DETECTION_RANGE_CATEGORY_SLUGS)[number];

export function supportsDetectionRangeFilter(
  categorySlug?: string | null
): boolean {
  return Boolean(
    categorySlug &&
      (DETECTION_RANGE_CATEGORY_SLUGS as readonly string[]).includes(
        categorySlug
      )
  );
}

export function productName(p: Product, locale: Locale): string {
  return locale === "ru" ? p.nameRu : p.nameUk;
}

/**
 * Card/list title: put brand+model first, device type at the end.
 * So line-clamp shows the model, not only «Тепловізор…».
 * Full `productName` stays for PDP / SEO / feeds.
 */
const DEVICE_TYPE_PREFIXES_UK = [
  "тепловізійний бінокль",
  "тепловізійний приціл",
  "тепловізійна насадка",
  "приціл нічного бачення",
  "монокуляр нічного бачення",
  "прилад нічного бачення",
  "нічна насадка на оптичний приціл",
  "нічна насадка",
  "біспектральний бінокуляр",
  "мультиспектральний приціл",
  "інфрачервоний ліхтар",
  "тепловізор",
  "монокуляр",
  "бінокль",
  "приціл",
  "насадка",
];

const DEVICE_TYPE_PREFIXES_RU = [
  "тепловизионный бинокль",
  "тепловизионный прицел",
  "тепловизионная насадка",
  "прицел ночного видения",
  "монокуляр ночного видения",
  "прибор ночного видения",
  "ночная насадка на оптический прицел",
  "ночная насадка",
  "биспектральный бинокуляр",
  "мультиспектральный прицел",
  "инфракрасный фонарь",
  "тепловизор",
  "монокуляр",
  "бинокль",
  "прицел",
  "насадка",
];

export function formatProductCardTitle(fullName: string): string {
  const raw = String(fullName || "").replace(/\s+/g, " ").trim();
  if (!raw) return raw;
  const lower = raw.toLowerCase();
  const prefixes =
    /[ыъё]|тепловизор|прицел|бинокль|ночного/i.test(raw)
      ? DEVICE_TYPE_PREFIXES_RU
      : DEVICE_TYPE_PREFIXES_UK;

  for (const prefix of prefixes) {
    if (!lower.startsWith(prefix)) continue;
    // require boundary after prefix (space or end)
    const after = raw.slice(prefix.length).trim();
    if (!after) return raw;
    // Keep original casing of the type word from the start of the name
    const typeLabel = raw.slice(0, prefix.length).trim();
    return `${after} — ${typeLabel}`;
  }
  return raw;
}

export function productCardTitle(p: Product, locale: Locale): string {
  return formatProductCardTitle(productName(p, locale));
}

export function productShort(p: Product, locale: Locale): string {
  return (locale === "ru" ? p.shortRu : p.shortUk) || "";
}

export function productDescription(p: Product, locale: Locale): string {
  return (locale === "ru" ? p.descriptionRu : p.descriptionUk) || "";
}

export function categoryName(c: Category, locale: Locale): string {
  return locale === "ru" ? c.nameRu : c.nameUk;
}

export function salePercent(price: number, oldPrice?: number | null): number | null {
  if (!oldPrice || oldPrice <= price) return null;
  return Math.round(((oldPrice - price) / oldPrice) * 100);
}
