import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { hasServiceSupabase } from "@/lib/supabase/service";
import { seedSupabaseCatalog } from "@/lib/db/seed-supabase";

/**
 * POST /api/admin/seed — upsert seed catalog into Supabase.
 * Also allows one-time bootstrap with header x-seed-secret = ADMIN_SESSION_SECRET or SEED_SECRET
 */
export async function POST(req: NextRequest) {
  const seedSecret =
    process.env.SEED_SECRET || process.env.ADMIN_SESSION_SECRET || "seed-once";
  const header = req.headers.get("x-seed-secret");
  const adminDenied = requireAdminApi(req);

  if (adminDenied && header !== seedSecret) {
    // allow bootstrap with seed secret
    if (!header || header !== seedSecret) {
      return adminDenied;
    }
  }

  if (!hasServiceSupabase()) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY not configured" },
      { status: 503 }
    );
  }

  try {
    const result = await seedSupabaseCatalog();
    if (result.products === 0) {
      return NextResponse.json(
        {
          ok: false,
          ...result,
          error:
            "productsCount is 0 — run SQL migration first (supabase/migrations/001_production.sql)",
        },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[seed]", e);
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Seed failed",
      },
      { status: 500 }
    );
  }
}
