import { NextRequest, NextResponse } from "next/server";
import {
  createServiceClient,
  hasServiceSupabase,
} from "@/lib/supabase/service";
import { clientIp, rateLimit } from "@/lib/admin/rate-limit";

const CHANNELS = new Set(["telegram", "whatsapp", "phone", "open_sheet"]);
const SOURCES = new Set([
  "hero",
  "widget",
  "footer",
  "header",
  "catalog",
  "other",
]);

/**
 * POST /api/analytics/consult
 * Public, best-effort log of consult CTA clicks.
 */
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const rl = rateLimit(`consult:${ip}`, 40, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  if (!hasServiceSupabase()) {
    return NextResponse.json({ ok: true, stored: false });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const channel = String(body.channel || "");
  const source = String(body.source || "other");
  const path = String(body.path || "").slice(0, 500);

  if (!CHANNELS.has(channel)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const src = SOURCES.has(source) ? source : "other";

  try {
    const sb = createServiceClient();
    const { error } = await sb.from("consult_events").insert({
      channel,
      source: src,
      path: path || null,
    });
    if (error) {
      // Table may not exist yet — don't break UX
      return NextResponse.json({ ok: true, stored: false });
    }
    return NextResponse.json({ ok: true, stored: true });
  } catch {
    return NextResponse.json({ ok: true, stored: false });
  }
}
