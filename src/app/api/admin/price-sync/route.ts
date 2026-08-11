import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { hasServiceSupabase } from "@/lib/supabase/service";
import { extractPriceFromUrl } from "@/lib/price-compare/extract-price";
import { syncAllPrices, syncLinkPrice } from "@/lib/price-compare/repo";

/**
 * Cron auth: only when CRON_SECRET/SEED_SECRET is set AND matches header.
 * Never treat "any Bearer" as cron (was an open door if secret missing).
 * Vercel Cron: set CRON_SECRET in env; platform sends Authorization: Bearer <CRON_SECRET>.
 */
function isCronRequest(req: NextRequest): boolean {
  const cronSecret = (
    process.env.CRON_SECRET ||
    process.env.SEED_SECRET ||
    ""
  ).trim();
  if (!cronSecret) return false;
  const headerCron = (
    req.headers.get("x-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  ).trim();
  if (!headerCron || headerCron.length !== cronSecret.length) return false;
  // constant-time-ish compare
  let out = 0;
  for (let i = 0; i < cronSecret.length; i++) {
    out |= cronSecret.charCodeAt(i) ^ headerCron.charCodeAt(i);
  }
  return out === 0;
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
 * body: { linkId } | { productId } | { testUrl } | {} all
 * GET  /api/admin/price-sync — Vercel Cron (daily)
 */
export async function POST(req: NextRequest) {
  const cron = isCronRequest(req);
  if (!cron) {
    const denied = await requireAdminApi(req);
    if (denied) return denied;
  }

  try {
    const body = await req.json().catch(() => ({}));

    // Dry-run: only parse URL, do not write DB
    if (body.testUrl) {
      const result = await extractPriceFromUrl(String(body.testUrl).trim());
      return NextResponse.json({
        ...result,
        test: true,
        url: String(body.testUrl).trim(),
      });
    }

    if (!hasServiceSupabase()) {
      return NextResponse.json(
        { error: "Supabase service role not configured" },
        { status: 503 }
      );
    }

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
    const denied = await requireAdminApi(req);
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
