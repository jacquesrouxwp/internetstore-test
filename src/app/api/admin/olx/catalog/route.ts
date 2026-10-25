import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { createServiceClient, hasServiceSupabase } from "@/lib/supabase/service";
import type { CatalogItem } from "@/lib/olx-terminal";

/** GET /api/admin/olx/catalog — our published products by brand and category, for pricing buy-ups. */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) return NextResponse.json({ items: [] });
  const { data, error } = await createServiceClient()
    .from("products")
    .select("slug, name_uk, price, brands(name), categories(name_uk)")
    .eq("published", true)
    .order("name_uk")
    .limit(3000);
  if (error) return NextResponse.json({ items: [], error: error.message });
  type Row = { slug: string; name_uk: string; price: number; brands: { name: string } | null; categories: { name_uk: string } | null };
  const items: CatalogItem[] = ((data ?? []) as unknown as Row[]).map((p) => ({
    slug: p.slug,
    name: p.name_uk,
    brand: p.brands?.name || "Без бренду",
    category: p.categories?.name_uk || "Інше",
    price: Number(p.price),
  }));
  return NextResponse.json({ items });
}
