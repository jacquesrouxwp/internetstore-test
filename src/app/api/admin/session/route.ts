import { NextRequest, NextResponse } from "next/server";
import {
  hasAdminCookie,
  isSupabaseAuthConfigured,
} from "@/lib/admin/auth";
import {
  getRuntimeBrands,
  getRuntimeCategories,
  getRuntimeOrders,
  getRuntimeProducts,
} from "@/data/seed";

export async function GET(req: NextRequest) {
  if (!hasAdminCookie(req)) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const products = getRuntimeProducts();
  const orders = getRuntimeOrders();
  const newOrders = orders.filter((o) => o.status === "new").length;

  return NextResponse.json({
    authenticated: true,
    mode: isSupabaseAuthConfigured() ? "supabase" : "demo",
    stats: {
      products: products.length,
      published: products.filter((p) => p.published).length,
      brands: getRuntimeBrands().length,
      categories: getRuntimeCategories().length,
      orders: orders.length,
      newOrders,
      lowStock: products.filter((p) => p.stock > 0 && p.stock <= 2).length,
      outOfStock: products.filter((p) => p.stock <= 0).length,
    },
  });
}
