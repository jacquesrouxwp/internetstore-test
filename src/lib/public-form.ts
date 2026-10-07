/**
 * Shared plumbing for the public request forms (trade-in, premium orders):
 * a per-IP budget and delivery to the Telegram chat the consultants read.
 */

import type { NextRequest } from "next/server";

/**
 * A small per-IP budget. Serverless recycles instances, so it thins floods
 * rather than stopping a determined one. Each form gets its own budget.
 */
export function createIpBudget(maxPerWindow: number, windowMs: number) {
  const seen = new Map<string, number[]>();
  return function overBudget(ip: string): boolean {
    const now = Date.now();
    const hits = (seen.get(ip) || []).filter((t) => now - t < windowMs);
    hits.push(now);
    seen.set(ip, hits);
    if (seen.size > 5000) seen.clear(); // keep the map from growing unbounded
    return hits.length > maxPerWindow;
  };
}

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Sends an HTML message to the consultants' chat. `tag` only labels the logs. */
export async function notifyTelegram(html: string, tag: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn(`[${tag}] TELEGRAM_BOT_TOKEN/CHAT_ID not set — request only logged`);
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error(`[${tag}] telegram`, res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error(`[${tag}] telegram error`, e);
    return false;
  }
}
