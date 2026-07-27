import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { hasServiceSupabase } from "@/lib/supabase/service";
import { syncAllPrices, syncLinkPrice } from "@/lib/price-compare/repo";

function isCronRequest(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET || process.env.SEED_SECRET;
  if (!cronSecret) {
    // Vercel Cron sends Authorization: Bearer <CRON_SECRET> when configured
    const auth = req.headers.get("authorization");
    return Boolean(auth?.startsWith("Bearer "));
  }
  const headerCron =
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return headerCron === cronSecret;
}

async function runSync(body: {
  linkId?: string;
  productId?: string;
  limit?: number;
}) {
  if (body.linkId) {
    return await syncLinkPrice(String(body.linkId));
  }
  return await syncAllPrices({
    productId: body.productId ? String(body.productId) : undefined,
    limit: body.limit ? Number(body.limit) : undefined,
  });
}

/**
 * POST /api/admin/price-sync — admin UI
 * GET  /api/admin/price-sync — Vercel Cron (daily)
 */
export async function POST(req: NextRequest) {
  const cron = isCronRequest(req);
  if (!cron) {
    const denied = requireAdminApi(req);
    if (denied) return denied;
  }

  if (!hasServiceSupabase()) {
    return NextResponse.json(
      { error: "Supabase service role not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const result = await runSync(body);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[price-sync]", e);
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Sync failed",
        hint: "Run migration 002_price_compare.sql and add product URLs",
      },
      { status: 500 }
    );
  }
}

/** Vercel Cron hits GET */
export async function GET(req: NextRequest) {
  if (!isCronRequest(req)) {
    // Allow admin cookie for manual GET test
    const denied = requireAdminApi(req);
    if (denied) return denied;
  }

  if (!hasServiceSupabase()) {
    return NextResponse.json(
      { error: "Supabase service role not configured" },
      { status: 503 }
    );
  }

  try {
    const result = await runSync({});
    return NextResponse.json(result);
  } catch (e) {
    console.error("[price-sync GET]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    );
  }
}
