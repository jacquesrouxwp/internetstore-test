import { NextRequest, NextResponse } from "next/server";
import { olxKeyDenied } from "@/lib/olx-api-key";
import { createServiceClient, hasServiceSupabase } from "@/lib/supabase/service";
import { loadModels } from "@/lib/olx-store";

/**
 * GET /api/olx/models (x-olx-key) — the owner's price list for the bots: per
 * model the target, the ceiling and what condition, box and documents move them by.
 */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const no = olxKeyDenied(req);
  if (no) return no;
  if (!hasServiceSupabase()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  return NextResponse.json({ models: await loadModels(createServiceClient()) });
}
