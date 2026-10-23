import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { createServiceClient, hasServiceSupabase } from "@/lib/supabase/service";
import { OLX_STATUSES, type OlxStatus } from "@/lib/olx-terminal";

export const dynamic = "force-dynamic";

/** GET /api/admin/olx — terminal rows with our current new price per model. */
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

  const slugs = Array.from(new Set((data ?? []).map((d) => d.product_slug).filter(Boolean))) as string[];
  const prices: Record<string, { price: number; name: string }> = {};
  if (slugs.length) {
    const { data: prods } = await sb.from("products").select("slug, name_uk, price").in("slug", slugs);
    for (const p of prods ?? []) prices[p.slug as string] = { price: Number(p.price), name: p.name_uk as string };
  }

  return NextResponse.json({
    deals: (data ?? []).map((d) => ({
      ...d,
      new_price: d.product_slug ? prices[d.product_slug]?.price ?? null : null,
      product_name: d.product_slug ? prices[d.product_slug]?.name ?? null : null,
    })),
  });
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
  if (body.decision === "ok") {
    const price = Math.round(Number(body.price));
    if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "price required" }, { status: 400 });
    update.owner_decision = `ok ${price}`;
    update.owner_decision_at = now;
    update.status = "negotiating";
  } else if (body.decision === "no") {
    update.owner_decision = "ні";
    update.owner_decision_at = now;
    update.status = "rejected";
  }
  if (typeof body.status === "string" && OLX_STATUSES.includes(body.status as OlxStatus)) update.status = body.status;
  if (typeof body.final_price === "number") update.final_price = Math.round(body.final_price);
  if (typeof body.notes === "string") update.notes = body.notes.slice(0, 2000);

  const sb = createServiceClient();
  const { data, error } = await sb.from("olx_deals").update(update).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deal: data });
}
