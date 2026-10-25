import { NextRequest, NextResponse } from "next/server";
import { olxKeyDenied } from "@/lib/olx-api-key";
import { createServiceClient, hasServiceSupabase } from "@/lib/supabase/service";

/**
 * GET /api/olx/models (x-olx-key) — the owner's price list for the bots: per
 * model a range per state of the item (see OLX_TIERS).
 */

export const dynamic = "force-dynamic";
// Supabase answers go through fetch; a cached one would hide new prices from the bots
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  const no = olxKeyDenied(req);
  if (no) return no;
  if (!hasServiceSupabase()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  const { data, error } = await createServiceClient().from("olx_models").select("*").order("name");
  if (error) return NextResponse.json({ models: [], error: error.message }, { status: 500 });
  return NextResponse.json({ models: data ?? [] });
}
