import type { Brand, Category, Order, OrderItem, Product } from "@/types";

export function mapDbProduct(row: Record<string, unknown>): Product {
  const brands = row.brands as { slug?: string; name?: string } | null;
  const categories = row.categories as { slug?: string } | null;

  let images: string[] = [];
  const rawImages = row.images;
  if (Array.isArray(rawImages)) {
    images = rawImages.map(String);
  } else if (typeof rawImages === "string") {
    try {
      const parsed = JSON.parse(rawImages);
      if (Array.isArray(parsed)) images = parsed.map(String);
    } catch {
      images = [];
    }
  }

  let specs: Record<string, string> = {};
  const rawSpecs = row.specs;
  if (rawSpecs && typeof rawSpecs === "object" && !Array.isArray(rawSpecs)) {
    specs = Object.fromEntries(
      Object.entries(rawSpecs as Record<string, unknown>).map(([k, v]) => [
        k,
        String(v ?? ""),
      ])
    );
  }

  return {
    id: String(row.id),
    slug: String(row.slug),
    sku: (row.sku as string) || null,
    nameUk: String(row.name_uk),
    nameRu: String(row.name_ru),
    descriptionUk: (row.description_uk as string) || null,
    descriptionRu: (row.description_ru as string) || null,
    shortUk: (row.short_uk as string) || null,
    shortRu: (row.short_ru as string) || null,
    price: Number(row.price),
    oldPrice: row.old_price != null ? Number(row.old_price) : null,
    stock: Number(row.stock ?? 0),
    brandId: (row.brand_id as string) || null,
    brandSlug: brands?.slug || (row.brand_slug as string) || null,
    brandName: brands?.name || (row.brand_name as string) || null,
    categoryId: (row.category_id as string) || null,
    categorySlug: categories?.slug || (row.category_slug as string) || null,
    resolution: (row.resolution as string) || null,
    deviceType: (row.device_type as Product["deviceType"]) || null,
    detectionRangeM:
      row.detection_range_m != null ? Number(row.detection_range_m) : null,
    rating: Number(row.rating ?? 0),
    reviewsCount: Number(row.reviews_count ?? 0),
    isHit: Boolean(row.is_hit),
    isNew: Boolean(row.is_new),
    isTop: Boolean(row.is_top),
    isSale: Boolean(row.is_sale),
    images,
    specs,
    published: Boolean(row.published ?? true),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

export function mapDbBrand(b: Record<string, unknown>): Brand {
  return {
    id: String(b.id),
    slug: String(b.slug),
    name: String(b.name),
    logoUrl: (b.logo_url as string) || null,
  };
}

export function mapDbCategory(c: Record<string, unknown>): Category {
  return {
    id: String(c.id),
    slug: String(c.slug),
    nameUk: String(c.name_uk),
    nameRu: String(c.name_ru),
    descriptionUk: (c.description_uk as string) || null,
    descriptionRu: (c.description_ru as string) || null,
    parentId: (c.parent_id as string) || null,
    sortOrder: c.sort_order != null ? Number(c.sort_order) : 0,
  };
}

export function productToDbRow(p: Partial<Product> & { slug?: string }) {
  return {
    ...(p.id && isUuid(p.id) ? { id: p.id } : {}),
    slug: p.slug,
    sku: p.sku ?? null,
    name_uk: p.nameUk,
    name_ru: p.nameRu,
    description_uk: p.descriptionUk ?? null,
    description_ru: p.descriptionRu ?? null,
    short_uk: p.shortUk ?? null,
    short_ru: p.shortRu ?? null,
    price: p.price,
    old_price: p.oldPrice ?? null,
    stock: p.stock ?? 0,
    brand_id: p.brandId && isUuid(p.brandId) ? p.brandId : null,
    category_id: p.categoryId && isUuid(p.categoryId) ? p.categoryId : null,
    resolution: p.resolution ?? null,
    device_type: p.deviceType ?? null,
    detection_range_m: p.detectionRangeM ?? null,
    rating: p.rating ?? 0,
    reviews_count: p.reviewsCount ?? 0,
    is_hit: Boolean(p.isHit),
    is_new: Boolean(p.isNew),
    is_top: Boolean(p.isTop),
    is_sale: Boolean(p.isSale),
    images: p.images ?? [],
    specs: p.specs ?? {},
    published: p.published !== false,
    updated_at: new Date().toISOString(),
  };
}

export function mapDbOrder(
  row: Record<string, unknown>,
  items?: OrderItem[]
): Order {
  return {
    id: String(row.id),
    orderNumber: String(row.order_number),
    status: row.status as Order["status"],
    customerName: String(row.customer_name),
    customerPhone: String(row.customer_phone),
    customerEmail: (row.customer_email as string) || null,
    paymentMethod: row.payment_method as Order["paymentMethod"],
    paymentStatus: String(row.payment_status || "pending"),
    deliveryMethod: String(row.delivery_method || "nova_poshta"),
    npCityRef: (row.np_city_ref as string) || null,
    npCityName: (row.np_city_name as string) || null,
    npWarehouseRef: (row.np_warehouse_ref as string) || null,
    npWarehouseName: (row.np_warehouse_name as string) || null,
    deliveryCost: Number(row.delivery_cost ?? 0),
    subtotal: Number(row.subtotal ?? 0),
    total: Number(row.total ?? 0),
    comment: (row.comment as string) || null,
    createdAt: String(row.created_at || new Date().toISOString()),
    items,
  };
}

export function mapDbOrderItem(row: Record<string, unknown>): OrderItem {
  return {
    id: String(row.id),
    productId: (row.product_id as string) || null,
    productName: String(row.product_name),
    productSlug: (row.product_slug as string) || null,
    price: Number(row.price),
    quantity: Number(row.quantity),
  };
}

export function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}
