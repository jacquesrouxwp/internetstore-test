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

export async function adminListProducts(q?: string): Promise<Product[]> {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, brands(slug, name), categories(slug)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  let products = (data || []).map((r) =>
    mapDbProduct(r as Record<string, unknown>)
  );
  if (q) {
    const s = q.toLowerCase();
    products = products.filter(
      (p) =>
        p.nameUk.toLowerCase().includes(s) ||
        p.nameRu.toLowerCase().includes(s) ||
        (p.sku || "").toLowerCase().includes(s) ||
        (p.brandName || "").toLowerCase().includes(s)
    );
  }
  return products;
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

export async function adminListOrders(
  status?: string | null
): Promise<Order[]> {
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  let q = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (status && status !== "all") q = q.eq("status", status);
  const { data, error } = await q;
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
  return orders;
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
  if (!hasServiceSupabase()) throw new Error("Supabase service not configured");
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return adminGetOrder(id);
}
