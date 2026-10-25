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
  type Row = { slug: string; name_uk: string; price: number; brands: { name: string } | null; categories: { name_uk: string } | null };
  // Supabase answers at most 1000 rows at a time
  const sb = createServiceClient();
  const rows: Row[] = [];
  for (let from = 0; from < 10000; from += 1000) {
    const { data, error } = await sb
      .from("products")
      .select("slug, name_uk, price, brands(name), categories(name_uk)")
      .eq("published", true)
      .order("name_uk")
      .range(from, from + 999);
    if (error) return NextResponse.json({ items: [], error: error.message });
    rows.push(...((data ?? []) as unknown as Row[]));
    if (!data || data.length < 1000) break;
  }
  const items: CatalogItem[] = rows.map((p) => ({
    slug: p.slug,
    name: p.name_uk,
    brand: p.brands?.name || "Без бренду",
    category: p.categories?.name_uk || "Інше",
    price: Number(p.price),
  }));
  return NextResponse.json({ items });
}
