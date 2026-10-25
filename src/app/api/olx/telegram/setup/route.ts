import { NextRequest, NextResponse } from "next/server";
import { olxKeyDenied } from "@/lib/olx-api-key";
import { olxTelegramReady, tg, webhookSecret } from "@/lib/olx-telegram";
import { absoluteUrl } from "@/lib/site-url";

/** POST /api/olx/telegram/setup (x-olx-key) — points the OLX bot's webhook at this site. */

export const dynamic = "force-dynamic";
// Supabase answers go through fetch; a cached one would hide new prices from the bots
export const fetchCache = "force-no-store";

export async function POST(req: NextRequest) {
  const no = olxKeyDenied(req);
  if (no) return no;
  const secret = webhookSecret();
  if (!secret) return NextResponse.json({ error: "OLX_TG_BOT_TOKEN is not set" }, { status: 503 });
  const set = await tg("setWebhook", {
    url: absoluteUrl("/api/olx/telegram"),
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
  });
  const info = await tg("getWebhookInfo", {});
  const me = await tg("getMe", {});
  const bot = (me?.result as { username?: string } | undefined)?.username ?? null;
  return NextResponse.json({ set, webhook: info?.result ?? null, bot, owner_chat_set: olxTelegramReady() });
}
