import { NextResponse } from "next/server";
import {
  createServiceClient,
  hasPublicSupabase,
  hasServiceSupabase,
  supabaseEnvStatus,
} from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/health/db
 * Server health-check against Supabase.
 */
export async function GET() {
  const env = supabaseEnvStatus();

  if (!hasPublicSupabase() && !hasServiceSupabase()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase env missing",
        env,
      },
      { status: 503 }
    );
  }

  if (!hasServiceSupabase()) {
    return NextResponse.json(
      {
        ok: false,
        error: "SUPABASE_SERVICE_ROLE_KEY missing or empty",
        env,
      },
      { status: 503 }
    );
  }

  try {
    const supabase = createServiceClient();
    const [products, categories, brands, orders] = await Promise.all([
      supabase.from("products").select("id", { count: "exact", head: true }),
      supabase.from("categories").select("id", { count: "exact", head: true }),
      supabase.from("brands").select("id", { count: "exact", head: true }),
      supabase.from("orders").select("id", { count: "exact", head: true }),
    ]);

    const err =
      products.error || categories.error || brands.error || orders.error;
    if (err) {
      return NextResponse.json(
        {
          ok: false,
          error: err.message,
          hint: "Run supabase/migrations/001_production.sql in Supabase SQL Editor, then POST /api/admin/seed",
          env,
          tablesReady: false,
        },
        { status: 500 }
      );
    }

    const productsCount = products.count ?? 0;
    return NextResponse.json({
      ok: true,
      productsCount,
      categoriesCount: categories.count ?? 0,
      brandsCount: brands.count ?? 0,
      ordersCount: orders.count ?? 0,
      tablesReady: true,
      seeded: productsCount > 0,
      env: {
        urlPresent: env.urlPresent,
        anonPresent: env.anonPresent,
        servicePresent: env.servicePresent,
        urlHost: env.urlHost,
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
        env,
      },
      { status: 500 }
    );
  }
}
