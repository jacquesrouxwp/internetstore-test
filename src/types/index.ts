export type Locale = "uk" | "ru";

export type DeviceType = "mono" | "scope" | "binocular" | "clipon";
export type Resolution = "256x192" | "384x288" | "640x512" | "160x120" | string;

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
  specs: Record<string, string>;
  published: boolean;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
}

export type OrderStatus =
  | "new"
  | "confirmed"
  | "paid"
  | "shipping"
  | "done"
  | "cancelled";

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
  npCityName?: string | null;
  npWarehouseName?: string | null;
  deliveryCost: number;
  subtotal: number;
  total: number;
  comment?: string | null;
  createdAt: string;
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
