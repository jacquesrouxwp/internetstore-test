import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { createServiceClient, hasServiceSupabase } from "@/lib/supabase/service";
import { OLX_STATUSES, normalizeOlxUrl, parseDealPatch, ownerDecision, type OlxDeal, type OlxStatus } from "@/lib/olx-terminal";
import { loadModels, withPrices } from "@/lib/olx-store";

export const dynamic = "force-dynamic";

/** GET /api/admin/olx — terminal rows with the buying prices for each item. */
export async function GET(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) return NextResponse.json({ deals: [], error: "Supabase not configured" });

  const sb = createServiceClient();
  const { data, error } = await sb
    .from("olx_deals")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(300);
  if (error) return NextResponse.json({ deals: [], error: error.message });

  return NextResponse.json({ deals: withPrices((data ?? []) as OlxDeal[], await loadModels(sb)) });
}

/**
 * PATCH /api/admin/olx — the owner's word on a deal.
 * { id, decision: "ok", price } · { id, decision: "no" } · { id, status }
 */
export async function PATCH(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };
  const sb = createServiceClient();

  // The owner's own words for the seller — a bot picks them up and sends them as is
  if (typeof body.send === "string" && body.send.trim()) {
    const { data: cur } = await sb.from("olx_deals").select("outbox").eq("id", id).maybeSingle();
    const outbox = Array.isArray(cur?.outbox) ? cur.outbox : [];
    update.outbox = [
      ...outbox,
      { id: crypto.randomUUID(), text: body.send.trim().slice(0, 2000), at: now, sent_at: null },
    ];
  }
  if (body.decision === "ok" || body.decision === "no") {
    const word = ownerDecision(body.decision, body.price, now);
    if (!word) return NextResponse.json({ error: "price required" }, { status: 400 });
    Object.assign(update, word);
  }
  if (typeof body.status === "string" && OLX_STATUSES.includes(body.status as OlxStatus)) update.status = body.status;
  if (typeof body.final_price === "number") update.final_price = Math.round(body.final_price);
  if (typeof body.notes === "string") update.notes = body.notes.slice(0, 2000);
  if (body.refresh === true) {
    // Only a request — updated_at stays, so the row still shows when the bot last read it
    delete update.updated_at;
    update.refresh_requested_at = now;
  }

  const { data, error } = await sb.from("olx_deals").update(update).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deal: data });
}

/** POST /api/admin/olx — the owner adds a listing by hand: { olx_url, model, asking_price, ... } */
export async function POST(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  // "Оновити все": ask the bots to re-read every deal still in play
  if (req.nextUrl.searchParams.get("refresh") === "all") {
    const { data, error } = await createServiceClient()
      .from("olx_deals")
      .update({ refresh_requested_at: new Date().toISOString() })
      .in("status", ["new", "negotiating", "needs_ok"])
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ requested: data?.length ?? 0 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const olxUrl = normalizeOlxUrl(body.olx_url);
  if (!olxUrl) return NextResponse.json({ error: "Потрібне посилання на оголошення olx.ua" }, { status: 400 });
  const patch = parseDealPatch(body);
  const sb = createServiceClient();

  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("olx_deals")
    .upsert({ olx_url: olxUrl, ...patch, updated_at: now }, { onConflict: "olx_url" })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deal: withPrices([data as OlxDeal], await loadModels(sb))[0] });
}

/** DELETE /api/admin/olx?id=… */
export async function DELETE(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await createServiceClient().from("olx_deals").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
