import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, hasServiceSupabase } from "@/lib/supabase/service";
import { normalizeOlxUrl, parseDealPatch, parseMessages, type OlxDeal } from "@/lib/olx-terminal";

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

function sameKey(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function denied(req: NextRequest): NextResponse | null {
  const key = process.env.OLX_TERMINAL_KEY?.trim();
  if (!key) return NextResponse.json({ error: "Terminal is off" }, { status: 503 });
  const given =
    req.headers.get("x-olx-key")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ||
    "";
  return given && sameKey(given, key) ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  const no = denied(req);
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
  const no = denied(req);
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
    const { data: hits } = await sb
      .from("products")
      .select("slug")
      .eq("published", true)
      .ilike("name_uk", `%${patch.model.replace(/[%_]/g, " ")}%`)
      .limit(2);
    if (hits && hits.length === 1) patch.product_slug = hits[0].slug as string;
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
    return NextResponse.json({ deal: data, created: false });
  }

  const { data, error } = await sb
    .from("olx_deals")
    .insert({ olx_url: olxUrl, ...patch, chat: messages, created_at: now, updated_at: now })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deal: data, created: true });
}
