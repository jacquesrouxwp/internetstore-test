/**
 * Telegram for the OLX terminal: the owner gets a message when a deal waits
 * for an ок, with Ок / Ні buttons, and a note when a deal is bought.
 *
 * A bot of its own (OLX_TG_BOT_TOKEN), not the consultants' one: its webhook
 * takes the button presses, and only the owner's chat (OLX_TG_CHAT_ID) may press.
 */

import { createHash } from "node:crypto";
import { CONDITION_LABEL, OLX_TIERS, bargainTrail, type ChatMessage, type OlxDeal, type OlxModel } from "@/lib/olx-terminal";
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

/** Under the deal's card in the group, when it has one. */
const underCard = (d: OlxDeal) =>
  d.tg_message_id ? { reply_parameters: { message_id: d.tg_message_id, allow_sending_without_reply: true } } : {};

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
    text: dealText(d, "🟡 <b>Продавець згоден — чекає ваш ок на покупку</b>"),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...underCard(d),
    reply_markup: {
      inline_keyboard: [
        [...row1, { text: "❌ Ні", callback_data: `no:${d.id}` }],
        [{ text: "Відкрити термінал", url: absoluteUrl("/admin/olx") }],
      ],
    },
  });
}

/**
 * A listing the bot just found: the group answers it with the price to start
 * bargaining at. The OLX link in the message tells the webhook which deal a reply is about.
 */
/** Sends the card; returns its message id, to post the chat under it. */
export async function notifyNewListing(
  d: TerminalDeal,
  ours: { slug: string; name: string; price: number } | null,
  model: OlxModel | null,
  photos: string[] = [],
): Promise<number | null> {
  if (!olxTelegramReady()) return null;
  const listed = d.listed_at ? listedAgo(d.listed_at) : null;
  const text = [
      "🆕 <b>Нове оголошення</b>",
      `<b>${esc(d.title || d.model || "—")}</b>`,
      esc([d.city, listed].filter(Boolean).join(" · ")),
      `Ціна: <b>${uah(d.asking_price)}</b>`,
      // What the listing says about the state, when the bot could read it there
      d.grade || d.condition || d.has_box !== null || d.has_docs !== null || d.kit ? `Стан: ${esc(conditionLine(d))}` : null,
      d.condition_notes ? `<i>${esc(d.condition_notes.slice(0, 300))}</i>` : null,
      ours ? `У нас на сайті: <b>${uah(ours.price)}</b> — <a href="${esc(absoluteUrl(`/product/${ours.slug}`))}">${esc(ours.name)}</a>` : null,
      ...(model ? buyList(model) : []),
      `<a href="${esc(d.olx_url)}">Оголошення на OLX</a>`,
      "",
      "<i>Відповідайте на це повідомлення: ціна старту (25000 або 25000-30000), «-» — пропускаємо, «@ причина» — не наше, прибрати, або питання продавцю — бот надішле його як є.</i>",
    ]
      .filter((l) => l !== null)
      .join("\n");
  const idOf = (r: Record<string, unknown> | null) => {
    const id = (r?.result as { message_id?: number } | undefined)?.message_id;
    return typeof id === "number" ? id : null;
  };
  // With photos the card is the first photo and the text its caption (Telegram allows 1024 characters there)
  let card =
    photos.length && text.length <= 1024
      ? idOf(await tg("sendPhoto", { chat_id: chatId(), photo: photos[0], caption: text, parse_mode: "HTML" }))
      : null;
  if (card && photos.length > 1) {
    // The rest as an album under the card, to flick through right in Telegram
    await tg("sendMediaGroup", {
      chat_id: chatId(),
      media: photos.slice(1, 10).map((url) => ({ type: "photo", media: url })),
      reply_parameters: { message_id: card, allow_sending_without_reply: true },
    });
  }
  // No photos, or Telegram could not fetch them: the text card, with OLX's own preview
  card ??= idOf(await tg("sendMessage", { chat_id: chatId(), text, parse_mode: "HTML", link_preview_options: { url: d.olx_url } }));
  return card;
}

/**
 * New lines of the chat with the seller, posted under the deal's card — the
 * group watches every bargain live. A deal without a card says which one it is.
 */
export async function notifyChat(d: OlxDeal, lines: ChatMessage[]) {
  if (!olxTelegramReady() || !lines.length) return;
  const said = lines.map((m) => `${m.from === "us" ? "🤖 <b>Ми:</b>" : "💬 <b>Продавець:</b>"} ${esc(m.text.slice(0, 700))}`);
  // The seller answered while we bargain: where it stands, and how to give a new price
  const answered = lines.some((m) => m.from === "seller") && (d.status === "negotiating" || d.status === "new");
  const text = [...said, ...(answered ? bargainSummary(d) : [])].join("\n");
  await tg("sendMessage", {
    chat_id: chatId(),
    // The link lets the group reply to this message too, with a price or a question
    text: d.tg_message_id ? `${text}\n<a href="${esc(d.olx_url)}">OLX</a>` : `<b>${esc(d.title || d.model || "—")}</b> · <a href="${esc(d.olx_url)}">OLX</a>\n${text}`,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...underCard(d),
  });
}

/**
 * A few lines to keep the thread of a bargain: the item and what the seller
 * first asked, the owner's start, the prices named in turn, and the replies
 * the group can give.
 */
function bargainSummary(d: OlxDeal): string[] {
  const trail = bargainTrail(d.chat || []).slice(-8);
  const next = Math.round(((d.our_offer || trail.filter((s) => s.from === "us").pop()?.price || 24000) + 1000) / 500) * 500;
  const start = d.owner_decision?.startsWith("старт") ? d.owner_decision.replace(/(\d{4,})/g, (n) => uah(Number(n))) : null;
  return [
    "",
    `📋 <b>${esc(d.model || d.title || "—")}</b> · хотів ${uah(d.asking_price)}`,
    start ? `Ваш ${esc(start)}` : null,
    trail.length ? `Торг: ${trail.map((s) => `${s.from === "us" ? "ми" : "він"} ${uah(s.price)}`).join(" → ")}` : null,
    // Plain digits, the way a reply has to be written
    `<i>↩️ Реплай: нова ціна <code>${next}</code> або <code>${next}-${next + 3000}</code>, «-» — пропустити, «@» — не наше, текст — питання</i>`,
  ].filter((l): l is string => l !== null);
}

/** The owner's buying ranges for a model, one line per priced state. */
function buyList(m: OlxModel): string[] {
  const lines = OLX_TIERS.flatMap(({ key, label }) => {
    const t = m.tiers[key];
    return t?.to ? [`  ${esc(label)}: ${uah(t.from)}–${uah(t.to)}${t.needs_ok ? " · з вашим ок" : ""}`] : [];
  });
  return lines.length ? [`Наш викуп (${esc(m.name)}):`, ...lines] : [];
}

/** "21 хв тому", "3 год тому", or the date — Telegram shows our times in the reader's own zone, this does not. */
export function listedAgo(iso: string, now = Date.now()): string {
  const min = Math.round((now - Date.parse(iso)) / 60_000);
  if (min < 1) return "щойно";
  if (min < 60) return `${min} хв тому`;
  if (min < 24 * 60) return `${Math.floor(min / 60)} год тому`;
  return new Date(iso).toLocaleDateString("uk-UA", { timeZone: "Europe/Kyiv", day: "2-digit", month: "2-digit" });
}

export async function notifyBought(d: TerminalDeal) {
  if (!olxTelegramReady()) return;
  const price = d.final_price || d.bargain_at;
  await tg("sendMessage", {
    chat_id: chatId(),
    text: dealText(d, `✅ <b>Куплено за ${uah(price)}</b>`),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...underCard(d),
  });
}

export const isOwnerChat = (id: unknown) => Boolean(chatId()) && String(id) === chatId();
