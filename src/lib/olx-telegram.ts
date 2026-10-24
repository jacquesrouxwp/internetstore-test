/**
 * Telegram for the OLX terminal: the owner gets a message when a deal waits
 * for an ок, with Ок / Ні buttons, and a note when a deal is bought.
 *
 * A bot of its own (OLX_TG_BOT_TOKEN), not the consultants' one: its webhook
 * takes the button presses, and only the owner's chat (OLX_TG_CHAT_ID) may press.
 */

import { createHash } from "node:crypto";
import { pctOfNew, priceWindow, type OlxDeal } from "@/lib/olx-terminal";
import { absoluteUrl } from "@/lib/site-url";

export type DealWithPrice = OlxDeal & { new_price: number | null; product_name: string | null };

const token = () => process.env.OLX_TG_BOT_TOKEN?.trim() || "";
const chatId = () => process.env.OLX_TG_CHAT_ID?.trim() || "";

export const olxTelegramReady = () => Boolean(token() && chatId());

/** Telegram echoes this in X-Telegram-Bot-Api-Secret-Token, so the webhook knows the call is real. */
export const webhookSecret = () => (token() ? createHash("sha256").update(`olx-webhook:${token()}`).digest("hex").slice(0, 48) : "");

export async function tg(method: string, body: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  if (!token()) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (!res.ok) console.error(`[olx-tg] ${method}`, res.status, JSON.stringify(data).slice(0, 300));
    return data;
  } catch (e) {
    console.error(`[olx-tg] ${method} error`, e);
    return null;
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const uah = (n: number | null | undefined) => (n ? new Intl.NumberFormat("uk-UA").format(n) : "—");
const withPct = (v: number | null | undefined, n: number | null) => (v ? `${uah(v)}${n ? ` (${pctOfNew(v, n)})` : ""}` : "—");

export function dealText(d: DealWithPrice, head: string): string {
  const n = d.new_price;
  const w = priceWindow(n);
  const lastSeller = [...(d.chat || [])].reverse().find((m) => m.from === "seller");
  return [
    head,
    `<b>${esc(d.product_name || d.model || d.title || "—")}</b>`,
    esc([d.seller_name, d.city].filter(Boolean).join(" · ") || "продавець"),
    "",
    `Хоче: <b>${withPct(d.asking_price, n)}</b>`,
    d.bargain_at ? `Торг на: <b>${withPct(d.bargain_at, n)}</b>` : "",
    d.our_offer ? `Ми пропонували: ${withPct(d.our_offer, n)}` : "",
    n && w ? `Новий у нас: ${uah(n)} · стеля 35% = ${uah(w.ceiling)}` : "Моделі немає в каталозі — ціну нового оцініть самі",
    lastSeller ? `\nПродавець: «${esc(lastSeller.text.slice(0, 200))}»` : "",
    `\n<a href="${esc(d.olx_url)}">Оголошення на OLX</a>`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/** The price an "Ок" agrees to: where the bargaining stands, else what the seller asks. */
export const okPrice = (d: OlxDeal) => d.bargain_at || d.asking_price || null;

export async function notifyNeedsOk(d: DealWithPrice) {
  if (!olxTelegramReady()) return;
  const price = okPrice(d);
  const row1 = price ? [{ text: `✅ Ок ${uah(price)}`, callback_data: `ok:${d.id}:${price}` }] : [];
  await tg("sendMessage", {
    chat_id: chatId(),
    text: dealText(d, "🟡 <b>Чекає ваш ок</b>"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard: [
        [...row1, { text: "❌ Ні", callback_data: `no:${d.id}` }],
        [{ text: "Відкрити термінал", url: absoluteUrl("/admin/olx") }],
      ],
    },
  });
}

export async function notifyBought(d: DealWithPrice) {
  if (!olxTelegramReady()) return;
  const price = d.final_price || d.bargain_at;
  await tg("sendMessage", {
    chat_id: chatId(),
    text: dealText(d, `✅ <b>Куплено за ${withPct(price, d.new_price)}</b>`),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

export const isOwnerChat = (id: unknown) => Boolean(chatId()) && String(id) === chatId();
