/**
 * Telegram for the OLX terminal: the owner gets a message when a deal waits
 * for an ок, with Ок / Ні buttons, and a note when a deal is bought.
 *
 * A bot of its own (OLX_TG_BOT_TOKEN), not the consultants' one: its webhook
 * takes the button presses, and only the owner's chat (OLX_TG_CHAT_ID) may press.
 */

import { createHash } from "node:crypto";
import { CONDITION_LABEL, type OlxDeal } from "@/lib/olx-terminal";
import type { TerminalDeal } from "@/lib/olx-store";
import { absoluteUrl } from "@/lib/site-url";

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
const yn = (v: boolean | null, word: string) => (v === true ? `${word} ✓` : v === false ? `без ${word === "коробка" ? "коробки" : "документів"}` : `${word} ?`);

/** What the seller says about the item: "як нове · коробка ✓ · без документів". */
export function conditionLine(d: OlxDeal): string {
  return [d.grade ? (d.grade === 10 ? "нове" : `${d.grade}/10`) : d.condition ? CONDITION_LABEL[d.condition] : "стан ?", yn(d.has_box, "коробка"), yn(d.has_docs, "документи"), d.kit]
    .filter(Boolean)
    .join(" · ");
}

export function dealText(d: TerminalDeal, head: string): string {
  const b = d.buy;
  const lastSeller = [...(d.chat || [])].reverse().find((m) => m.from === "seller");
  return [
    head,
    `<b>${esc(b?.model_name || d.model || d.title || "—")}</b>`,
    esc([d.seller_name, d.city].filter(Boolean).join(" · ") || "продавець"),
    esc(conditionLine(d)),
    "",
    `Хоче: <b>${uah(d.asking_price)}</b>`,
    d.bargain_at ? `Торг на: <b>${uah(d.bargain_at)}</b>` : "",
    d.our_offer ? `Ми пропонували: ${uah(d.our_offer)}` : "",
    !b
      ? "Ціни на цю модель ще немає — вирішуйте самі"
      : b.to
        ? `${esc(b.tier_label ?? "")}: від ${uah(b.from)} до ${uah(b.to)}${b.needs_ok ? " · лише з вашим ок" : ""}${b.unknown.length ? ` (уточнити: ${b.unknown.join(", ")})` : ""}`
        : `${b.tier_label ? `${esc(b.tier_label)}: ` : ""}ціни немає${b.unknown.length ? ` (уточнити: ${b.unknown.join(", ")})` : ""}`,
    lastSeller ? `\nПродавець: «${esc(lastSeller.text.slice(0, 200))}»` : "",
    `\n<a href="${esc(d.olx_url)}">Оголошення на OLX</a>`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

/** The price an "Ок" agrees to: where the bargaining stands, else what the seller asks. */
export const okPrice = (d: OlxDeal) => d.bargain_at || d.asking_price || null;

export async function notifyNeedsOk(d: TerminalDeal) {
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

export async function notifyBought(d: TerminalDeal) {
  if (!olxTelegramReady()) return;
  const price = d.final_price || d.bargain_at;
  await tg("sendMessage", {
    chat_id: chatId(),
    text: dealText(d, `✅ <b>Куплено за ${uah(price)}</b>`),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  });
}

export const isOwnerChat = (id: unknown) => Boolean(chatId()) && String(id) === chatId();
