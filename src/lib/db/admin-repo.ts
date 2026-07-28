import type { Brand, Category, Order, OrderStatus, Product } from "@/types";
import {
  createServiceClient,
  hasServiceSupabase,
} from "@/lib/supabase/service";
import {
  isUuid,
  mapDbBrand,
  mapDbCategory,
  mapDbOrder,
  mapDbOrderItem,
  mapDbProduct,
  productToDbRow,
} from "@/lib/supabase/mappers";

export type AdminProductListParams = {
  q?: string;
  categoryId?: string;
  brandId?: string;
  published?: "all" | "yes" | "no";
  stock?: "all" | "in" | "out" | "low";
  sort?: string;
  page?: number;
  limit?: number;
  lowThreshold?: number;
};

export async function adminListProducts(
  params: string | AdminProductListParams = {}
): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const p: AdminProductListParams =
    typeof params === "string" ? { q: params } : params || {};
  const page = Math.max(1, p.page || 1);
  const limit = Math.min(100, Math.max(1, p.limit || 50));
  const low = p.lowThreshold ?? 2;
  const supabase = createServiceClient();

  let q = supabase
    .from("products")
    .select("*, brands(slug, name), categories(slug)", { count: "exact" });

  if (p.categoryId) q = q.eq("category_id", p.categoryId);
  if (p.brandId) q = q.eq("brand_id", p.brandId);
  if (p.published === "yes") q = q.eq("published", true);
  if (p.published === "no") q = q.eq("published", false);
  if (p.stock === "in") q = q.gt("stock", 0);
  if (p.stock === "out") q = q.eq("stock", 0);
  if (p.stock === "low") q = q.gt("stock", 0).lte("stock", low);
  if (p.q?.trim()) {
    const s = p.q.trim().replace(/%/g, "");
    q = q.or(
      `name_uk.ilike.%${s}%,name_ru.ilike.%${s}%,sku.ilike.%${s}%,slug.ilike.%${s}%`
    );
  }

  switch (p.sort) {
    case "price_asc":
      q = q.order("price", { ascending: true });
      break;
    case "price_desc":
      q = q.order("price", { ascending: false });
      break;
    case "stock_asc":
      q = q.order("stock", { ascending: true });
      break;
    case "stock_desc":
      q = q.order("stock", { ascending: false });
      break;
    case "name":
      q = q.order("name_uk", { ascending: true });
      break;
    default:
      q = q.order("created_at", { ascending: false });
  }

  const from = (page - 1) * limit;
  q = q.range(from, from + limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return {
    products: (data || []).map((r) =>
      mapDbProduct(r as Record<string, unknown>)
    ),
    total: count ?? 0,
    page,
    limit,
  };
}

export async function adminGetProduct(id: string): Promise<Product | null> {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, brands(slug, name), categories(slug)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapDbProduct(data as Record<string, unknown>);
}

export async function adminUpsertProduct(
  product: Product,
  isNew: boolean
): Promise<Product> {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  const row = productToDbRow(product);

  if (isNew || !isUuid(product.id)) {
    delete (row as { id?: string }).id;
    const { data, error } = await supabase
      .from("products")
      .insert(row)
      .select("*, brands(slug, name), categories(slug)")
      .single();
    if (error) throw error;
    return mapDbProduct(data as Record<string, unknown>);
  }

  const { data, error } = await supabase
    .from("products")
    .update(row)
    .eq("id", product.id)
    .select("*, brands(slug, name), categories(slug)")
    .single();
  if (error) throw error;
  return mapDbProduct(data as Record<string, unknown>);
}

export async function adminDeleteProduct(id: string): Promise<void> {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function adminListBrands(): Promise<Brand[]> {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .order("name");
  if (error) throw error;
  return (data || []).map((b) => mapDbBrand(b as Record<string, unknown>));
}

export async function adminUpsertBrand(brand: Brand, isNew: boolean) {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  const row = {
    slug: brand.slug,
    name: brand.name,
    logo_url: brand.logoUrl ?? null,
  };
  if (isNew || !isUuid(brand.id)) {
    const { data, error } = await supabase
      .from("brands")
      .upsert(row, { onConflict: "slug" })
      .select("*")
      .single();
    if (error) throw error;
    return mapDbBrand(data as Record<string, unknown>);
  }
  const { data, error } = await supabase
    .from("brands")
    .update(row)
    .eq("id", brand.id)
    .select("*")
    .single();
  if (error) throw error;
  return mapDbBrand(data as Record<string, unknown>);
}

export async function adminDeleteBrand(id: string) {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  const { error } = await supabase.from("brands").delete().eq("id", id);
  if (error) throw error;
}

export async function adminListCategories(): Promise<Category[]> {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data || []).map((c) => mapDbCategory(c as Record<string, unknown>));
}

export async function adminUpsertCategory(cat: Category, isNew: boolean) {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  const row = {
    slug: cat.slug,
    name_uk: cat.nameUk,
    name_ru: cat.nameRu,
    description_uk: cat.descriptionUk ?? null,
    description_ru: cat.descriptionRu ?? null,
    parent_id: cat.parentId && isUuid(cat.parentId) ? cat.parentId : null,
    sort_order: cat.sortOrder ?? 0,
  };
  if (isNew || !isUuid(cat.id)) {
    const { data, error } = await supabase
      .from("categories")
      .upsert(row, { onConflict: "slug" })
      .select("*")
      .single();
    if (error) throw error;
    return mapDbCategory(data as Record<string, unknown>);
  }
  const { data, error } = await supabase
    .from("categories")
    .update(row)
    .eq("id", cat.id)
    .select("*")
    .single();
  if (error) throw error;
  return mapDbCategory(data as Record<string, unknown>);
}

export async function adminDeleteCategory(id: string) {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export type AdminOrderListParams = {
  status?: string | null;
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
};

export async function adminListOrders(
  statusOrParams?: string | null | AdminOrderListParams
): Promise<{ orders: Order[]; total: number; page: number; limit: number }> {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const p: AdminOrderListParams =
    typeof statusOrParams === "object" && statusOrParams !== null
      ? statusOrParams
      : { status: statusOrParams as string | null };
  const page = Math.max(1, p.page || 1);
  const limit = Math.min(100, Math.max(1, p.limit || 30));
  const supabase = createServiceClient();

  let q = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (p.status && p.status !== "all") q = q.eq("status", p.status);
  if (p.dateFrom) q = q.gte("created_at", p.dateFrom);
  if (p.dateTo) {
    // inclusive end day
    const end = p.dateTo.includes("T")
      ? p.dateTo
      : `${p.dateTo}T23:59:59.999Z`;
    q = q.lte("created_at", end);
  }
  if (p.q?.trim()) {
    const s = p.q.trim().replace(/%/g, "");
    q = q.or(
      `order_number.ilike.%${s}%,customer_phone.ilike.%${s}%,customer_name.ilike.%${s}%,customer_email.ilike.%${s}%`
    );
  }

  const from = (page - 1) * limit;
  q = q.range(from, from + limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;

  const orders: Order[] = [];
  for (const row of data || []) {
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", row.id);
    orders.push(
      mapDbOrder(
        row as Record<string, unknown>,
        (items || []).map((i) => mapDbOrderItem(i as Record<string, unknown>))
      )
    );
  }
  return { orders, total: count ?? 0, page, limit };
}

export async function adminGetOrder(id: string): Promise<Order | null> {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", id);
  return mapDbOrder(
    data as Record<string, unknown>,
    (items || []).map((i) => mapDbOrderItem(i as Record<string, unknown>))
  );
}

export async function adminUpdateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<Order | null> {
  return adminPatchOrder(id, { status });
}

export async function adminPatchOrder(
  id: string,
  patch: {
    status?: OrderStatus;
    managerComment?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
    statusNotifiedAt?: string | null;
    paymentStatus?: string;
  }
): Promise<Order | null> {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.status != null) row.status = patch.status;
  if (patch.managerComment !== undefined)
    row.manager_comment = patch.managerComment;
  if (patch.trackingNumber !== undefined)
    row.tracking_number = patch.trackingNumber;
  if (patch.trackingUrl !== undefined) row.tracking_url = patch.trackingUrl;
  if (patch.statusNotifiedAt !== undefined)
    row.status_notified_at = patch.statusNotifiedAt;
  if (patch.paymentStatus != null) row.payment_status = patch.paymentStatus;

  const { data, error } = await supabase
    .from("orders")
    .update(row)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return adminGetOrder(id);
}

export async function adminBulkProducts(
  ids: string[],
  action:
    | { type: "publish"; published: boolean }
    | { type: "delete" }
    | { type: "pricePercent"; percent: number }
): Promise<number> {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  if (!ids.length) return 0;
  const supabase = createServiceClient();
  if (action.type === "delete") {
    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) throw error;
    return ids.length;
  }
  if (action.type === "publish") {
    const { error, count } = await supabase
      .from("products")
      .update({
        published: action.published,
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);
    if (error) throw error;
    return count ?? ids.length;
  }
  if (action.type === "pricePercent") {
    const { data, error } = await supabase
      .from("products")
      .select("id, price")
      .in("id", ids);
    if (error) throw error;
    let n = 0;
    const factor = 1 + action.percent / 100;
    for (const row of data || []) {
      const price = Math.max(0, Math.round(Number(row.price) * factor));
      await supabase
        .from("products")
        .update({ price, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      n++;
    }
    return n;
  }
  return 0;
}

export async function adminDuplicateProduct(
  id: string
): Promise<Product | null> {
  const src = await adminGetProduct(id);
  if (!src) return null;
  const copy: Product = {
    ...src,
    id: `new-${Date.now()}`,
    slug: `${src.slug}-copy-${Date.now().toString(36).slice(-4)}`,
    nameUk: `${src.nameUk} (копія)`,
    nameRu: `${src.nameRu} (копія)`,
    published: false,
    sku: src.sku ? `${src.sku}-COPY` : null,
  };
  return adminUpsertProduct(copy, true);
}

export async function adminPatchProductFields(
  id: string,
  fields: { price?: number; stock?: number; published?: boolean }
): Promise<Product | null> {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (fields.price != null) row.price = fields.price;
  if (fields.stock != null) row.stock = fields.stock;
  if (fields.published != null) row.published = fields.published;
  const { error } = await supabase.from("products").update(row).eq("id", id);
  if (error) throw error;
  return adminGetProduct(id);
}
