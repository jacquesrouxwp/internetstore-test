import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, hasServiceSupabase } from "@/lib/supabase/service";
import { olxKeyDenied } from "@/lib/olx-api-key";
import { notifyBought, notifyNeedsOk } from "@/lib/olx-telegram";
import { normalizeOlxUrl, parseDealPatch, parseMessages, type OlxDeal } from "@/lib/olx-terminal";
import { loadModels, withPrices } from "@/lib/olx-store";

/**
 * OLX terminal API for the owner's bots (see /admin/olx).
 *
 *   GET  /api/olx/deals?status=needs_ok      — deals, newest first, each with `buy` (target/ceiling for this item)
 *   GET  /api/olx/deals?outbox=1             — only deals with owner messages waiting to be sent
 *   GET  /api/olx/deals?refresh=1            — only deals the owner asked to re-read now
 *   POST /api/olx/deals                      — create or update one deal by olx_url, append chat lines
 *
 * Auth: header `x-olx-key: <OLX_TERMINAL_KEY>`. Without the env var the API is off.
 */

export const dynamic = "force-dynamic";
// Supabase answers go through fetch; a cached one would hide new prices from the bots
export const fetchCache = "force-no-store";

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
  return NextResponse.json({ deals: withPrices(deals, await loadModels(sb)) });
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
    return NextResponse.json({ deal: await priced(sb, prev.status, data as OlxDeal), created: false });
  }

  const { data, error } = await sb
    .from("olx_deals")
    .insert({ olx_url: olxUrl, ...patch, chat: messages, created_at: now, updated_at: now })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deal: await priced(sb, null, data as OlxDeal), created: true });
}

/**
 * The deal with its buying prices, so the bot sees at once what this item is
 * worth to us; tells the owner in Telegram when it starts waiting for an ок or is bought.
 */
async function priced(sb: ReturnType<typeof createServiceClient>, was: string | null, deal: OlxDeal) {
  const [d] = withPrices([deal], await loadModels(sb));
  if (d.status !== was) {
    if (d.status === "needs_ok") await notifyNeedsOk(d);
    else if (d.status === "bought") await notifyBought(d);
  }
  return d;
}
