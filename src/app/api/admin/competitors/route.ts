import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { hasServiceSupabase } from "@/lib/supabase/service";
import {
  ensureThreeCompetitors,
  upsertCompetitor,
} from "@/lib/price-compare/repo";
import { slugify } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) {
    return NextResponse.json(
      { error: "Supabase not configured", competitors: [] },
      { status: 503 }
    );
  }
  try {
    const competitors = await ensureThreeCompetitors();
    return NextResponse.json({ competitors, source: "supabase" });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Error",
        hint: "Run supabase/migrations/002_price_compare.sql",
      },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "name required" }, { status: 400 });
    }
    const competitor = await upsertCompetitor({
      id: body.id,
      name,
      slug: body.slug || slugify(name),
      website: body.website || null,
      sortOrder: Number(body.sortOrder ?? 0),
      isActive: body.isActive !== false,
    });
    return NextResponse.json({ competitor });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
