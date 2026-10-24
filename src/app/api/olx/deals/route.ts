import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, hasServiceSupabase } from "@/lib/supabase/service";
import { olxKeyDenied } from "@/lib/olx-api-key";
import { notifyBought, notifyNeedsOk, type DealWithPrice } from "@/lib/olx-telegram";
import { normalizeOlxUrl, parseDealPatch, parseMessages, catalogSearchTokens, pickCatalogMatch, type OlxDeal } from "@/lib/olx-terminal";

/**
 * OLX terminal API for the owner's bots (see /admin/olx).
 *
 *   GET  /api/olx/deals?status=needs_ok      — deals, newest first (bots read owner decisions here)
 *   GET  /api/olx/deals?outbox=1             — only deals with owner messages waiting to be sent
 *   GET  /api/olx/deals?refresh=1            — only deals the owner asked to re-read now
 *   POST /api/olx/deals                      — create or update one deal by olx_url, append chat lines
 *
 * Auth: header `x-olx-key: <OLX_TERMINAL_KEY>`. Without the env var the API is off.
 */

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const no = olxKeyDenied(req);
  if (no) return no;
  if (!hasServiceSupabase()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const sb = createServiceClient();
  let q = sb.from("olx_deals").select("*").order("updated_at", { ascending: false }).limit(200);
  const status = req.nextUrl.searchParams.get("status");
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  let deals = (data ?? []) as OlxDeal[];
  if (req.nextUrl.searchParams.get("outbox")) {
    deals = deals.filter((d) => (d.outbox || []).some((m) => !m.sent_at));
  }
  if (req.nextUrl.searchParams.get("refresh")) {
    deals = deals.filter((d) => d.refresh_requested_at);
  }
  return NextResponse.json({ deals });
}

export async function POST(req: NextRequest) {
  const no = olxKeyDenied(req);
  if (no) return no;
  if (!hasServiceSupabase()) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON body expected" }, { status: 400 });
  }
  const olxUrl = normalizeOlxUrl(body.olx_url);
  if (!olxUrl) return NextResponse.json({ error: "olx_url must be an olx.ua listing link" }, { status: 400 });

  const patch = parseDealPatch(body);
  const messages = parseMessages(body.messages ?? body.message);
  const sb = createServiceClient();

  // A model named in words is tied to our catalogue when exactly one product matches
  if (!patch.product_slug && patch.model) {
    let q = sb.from("products").select("slug, name_uk").eq("published", true);
    for (const t of catalogSearchTokens(patch.model)) q = q.ilike("name_uk", `%${t.replace(/[%_]/g, " ")}%`);
    const { data: hits } = await q.limit(60);
    patch.product_slug = pickCatalogMatch(patch.model, (hits ?? []) as { slug: string; name_uk: string }[]) ?? undefined;
    if (!patch.product_slug) delete patch.product_slug;
  }

  const { data: existing } = await sb.from("olx_deals").select("*").eq("olx_url", olxUrl).maybeSingle();
  const now = new Date().toISOString();

  if (existing) {
    const prev = existing as OlxDeal;
    // Owner's messages the bot has sent: mark them, and put them in the chat
    const sentIds = Array.isArray(body.outbox_sent) ? body.outbox_sent.map(String) : [];
    const waiting = (prev.outbox || []).filter((m) => !m.sent_at && sentIds.includes(m.id));
    const outbox = (prev.outbox || []).map((m) => (waiting.includes(m) ? { ...m, sent_at: now } : m));
    const sentLines = waiting.map((m) => ({ at: now, from: "us" as const, text: m.text }));
    const { data, error } = await sb
      .from("olx_deals")
      // Any update from the bot answers an "оновити" request
      .update({
        ...patch,
        chat: [...(prev.chat || []), ...messages, ...sentLines],
        outbox,
        refresh_requested_at: null,
        updated_at: now,
      })
      .eq("id", prev.id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await notifyOwner(sb, prev.status, data as OlxDeal);
    return NextResponse.json({ deal: data, created: false });
  }

  const { data, error } = await sb
    .from("olx_deals")
    .insert({ olx_url: olxUrl, ...patch, chat: messages, created_at: now, updated_at: now })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await notifyOwner(sb, null, data as OlxDeal);
  return NextResponse.json({ deal: data, created: true });
}

/** Telegram to the owner when a deal starts waiting for an ок, or is bought. */
async function notifyOwner(sb: ReturnType<typeof createServiceClient>, was: string | null, deal: OlxDeal) {
  if (deal.status === was || (deal.status !== "needs_ok" && deal.status !== "bought")) return;
  type Product = { price: number; name_uk: string };
  const product: Product | null = deal.product_slug
    ? ((await sb.from("products").select("price, name_uk").eq("slug", deal.product_slug).maybeSingle()).data as Product | null)
    : null;
  const d: DealWithPrice = { ...deal, new_price: product ? Number(product.price) : null, product_name: product?.name_uk ?? null };
  if (deal.status === "needs_ok") await notifyNeedsOk(d);
  else await notifyBought(d);
}
