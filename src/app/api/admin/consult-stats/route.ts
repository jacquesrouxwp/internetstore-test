import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  createServiceClient,
  hasServiceSupabase,
} from "@/lib/supabase/service";

/**
 * GET /api/admin/consult-stats?days=30
 * Aggregates consult CTA clicks for the admin panel.
 */
export async function GET(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;

  if (!hasServiceSupabase()) {
    return NextResponse.json({
      ok: false,
      error: "Supabase not configured",
      total: 0,
      byChannel: {},
      bySource: {},
      byDay: [],
      recent: [],
    });
  }

  const daysRaw = Number(req.nextUrl.searchParams.get("days") || 30);
  const days = Number.isFinite(daysRaw)
    ? Math.min(365, Math.max(1, Math.round(daysRaw)))
    : 30;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    const sb = createServiceClient();
    const { data, error } = await sb
      .from("consult_events")
      .select("id, channel, source, path, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);

    if (error) {
      return NextResponse.json({
        ok: false,
        error:
          error.message?.includes("consult_events") || error.code === "42P01"
            ? "Run migration 006_consult_events.sql in Supabase"
            : error.message,
        total: 0,
        byChannel: {},
        bySource: {},
        byDay: [],
        recent: [],
      });
    }

    const rows = data || [];
    const byChannel: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const dayMap = new Map<string, number>();

    for (const r of rows) {
      const ch = String(r.channel);
      const src = String(r.source);
      byChannel[ch] = (byChannel[ch] || 0) + 1;
      bySource[src] = (bySource[src] || 0) + 1;
      const day = String(r.created_at).slice(0, 10);
      dayMap.set(day, (dayMap.get(day) || 0) + 1);
    }

    const byDay = Array.from(dayMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      ok: true,
      days,
      total: rows.length,
      byChannel,
      bySource,
      byDay,
      recent: rows.slice(0, 40),
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      error: e instanceof Error ? e.message : "error",
      total: 0,
      byChannel: {},
      bySource: {},
      byDay: [],
      recent: [],
    });
  }
}
