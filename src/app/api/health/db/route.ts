import { NextRequest, NextResponse } from "next/server";
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
 * Public: minimal { ok } only (no counts / host leak).
 * Detailed: header x-health-secret or ?secret= matching HEALTH_SECRET | CRON_SECRET | SEED_SECRET.
 */
export async function GET(req: NextRequest) {
  const env = supabaseEnvStatus();
  const secret =
    process.env.HEALTH_SECRET ||
    process.env.CRON_SECRET ||
    process.env.SEED_SECRET ||
    "";
  const provided =
    req.headers.get("x-health-secret") ||
    req.nextUrl.searchParams.get("secret") ||
    "";
  const detailed = Boolean(secret && provided && provided === secret);

  if (!hasPublicSupabase() && !hasServiceSupabase()) {
    return NextResponse.json(
      detailed
        ? { ok: false, error: "Supabase env missing", env }
        : { ok: false },
      { status: 503 }
    );
  }

  if (!hasServiceSupabase()) {
    return NextResponse.json(
      detailed
        ? {
            ok: false,
            error: "SUPABASE_SERVICE_ROLE_KEY missing or empty",
            env,
          }
        : { ok: false },
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
        detailed
          ? {
              ok: false,
              error: err.message,
              tablesReady: false,
              env,
            }
          : { ok: false },
        { status: 500 }
      );
    }

    if (!detailed) {
      return NextResponse.json({ ok: true });
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
      detailed
        ? {
            ok: false,
            error: e instanceof Error ? e.message : "Unknown error",
            env,
          }
        : { ok: false },
      { status: 500 }
    );
  }
}
