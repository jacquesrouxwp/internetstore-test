import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, hasServiceSupabase } from "@/lib/supabase/service";
import { randomUUID } from "node:crypto";
import { normalizeOlxUrl, ownerDecision, startDecision, type OlxDeal, type OutboxMessage } from "@/lib/olx-terminal";
import { isOwnerChat, tg, webhookSecret } from "@/lib/olx-telegram";

/**
 * Webhook of the OLX terminal's Telegram bot: Ок / Ні presses from the owner,
 * replies in the group to a deal's messages — a start price, "@ why" to drop a
 * listing we don't want, or words the bot passes to the seller as they are —
 * and /start, which
 * tells whoever writes their chat id (to set OLX_TG_CHAT_ID).
 */

export const dynamic = "force-dynamic";
// Supabase answers go through fetch; a cached one would hide new prices from the bots
export const fetchCache = "force-no-store";

type Entity = { type: string; url?: string };
type Update = {
  message?: {
    chat: { id: number };
    message_id: number;
    text?: string;
    reply_to_message?: { message_id: number; text?: string; entities?: Entity[]; caption_entities?: Entity[] };
  };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number }; message_id: number; text?: string } };
};

const uah = (n: number) => new Intl.NumberFormat("uk-UA").format(n);

export async function POST(req: NextRequest) {
  const secret = webhookSecret();
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const u = (await req.json().catch(() => ({}))) as Update;

  if (u.message?.reply_to_message) {
    await startPrice(u.message);
    return NextResponse.json({ ok: true });
  }
  if (u.message) {
    const chat = u.message.chat.id;
    // In a group only /start answers, not every line people write there
    if (!/^\/start(@|\s|$)/.test(u.message.text || "")) return NextResponse.json({ ok: true });
    await tg("sendMessage", {
      chat_id: chat,
      text: isOwnerChat(chat)
        ? "Сповіщення OLX-термінала підключено ✅ Сюди приходитимуть угоди, що чекають вашого ок."
        : `Ваш chat id: ${chat}\nЩоб отримувати сповіщення, його треба вписати в налаштування сайту (OLX_TG_CHAT_ID).`,
    });
    return NextResponse.json({ ok: true });
  }

  const cb = u.callback_query;
  if (!cb?.message) return NextResponse.json({ ok: true });
  const answer = (text: string) => tg("answerCallbackQuery", { callback_query_id: cb.id, text, show_alert: false });
  if (!isOwnerChat(cb.message.chat.id)) {
    await answer("Немає доступу");
    return NextResponse.json({ ok: true });
  }
  if (!hasServiceSupabase()) {
    await answer("База недоступна, спробуйте в терміналі");
    return NextResponse.json({ ok: true });
  }

  const [kind, id, price] = (cb.data || "").split(":");
  const sb = createServiceClient();
  const { data: deal } = await sb.from("olx_deals").select("*").eq("id", id).maybeSingle();
  if (!deal) {
    await answer("Угоду не знайдено");
    return NextResponse.json({ ok: true });
  }
  if (["bought", "rejected", "lost"].includes((deal as OlxDeal).status)) {
    await answer("Угода вже закрита");
    return NextResponse.json({ ok: true });
  }

  const now = new Date().toISOString();
  const word = ownerDecision(kind, price, now);
  if (!word) {
    await answer("Не зрозумів кнопку");
    return NextResponse.json({ ok: true });
  }
  const { error } = await sb.from("olx_deals").update({ ...word, updated_at: now }).eq("id", id);
  if (error) {
    await answer("Не вдалося зберегти, спробуйте в терміналі");
    return NextResponse.json({ ok: true });
  }

  const verdict = kind === "ok" ? `✅ Ви погодили ${uah(Number(price))} — бот закриває угоду` : "❌ Ви відмовили";
  await answer(kind === "ok" ? "Погоджено" : "Відмовлено");
  // Keep the deal in the message, drop the buttons, add the verdict
  await tg("editMessageText", {
    chat_id: cb.message.chat.id,
    message_id: cb.message.message_id,
    text: `${cb.message.text ?? ""}\n\n${verdict}`,
    disable_web_page_preview: true,
  });
  return NextResponse.json({ ok: true });
}

/**
 * A reply to a deal's message in the group: a start price, "-" to skip, and
 * anything else is a question for the seller, which the bot sends as written.
 */
async function startPrice(msg: NonNullable<Update["message"]>) {
  const say = (text: string) => tg("sendMessage", { chat_id: msg.chat.id, text, reply_to_message_id: msg.message_id });
  if (!isOwnerChat(msg.chat.id) || !hasServiceSupabase()) return;
  // A card with photos keeps its links in the caption
  const r = msg.reply_to_message;
  const link = [...(r?.entities || []), ...(r?.caption_entities || [])].map((e) => normalizeOlxUrl(e.url)).find(Boolean);
  if (!link) return; // a reply to something other than a listing card
  const now = new Date().toISOString();
  const text = (msg.text || "").trim();
  if (!text) return;
  const word = startDecision(text, now);
  // "@ …": not for us — the card and the reply leave the group, the reason stays in the terminal
  const drop = text.startsWith("@");
  const clearAway = () =>
    Promise.all([r!.message_id, msg.message_id].map((message_id) => tg("deleteMessage", { chat_id: msg.chat.id, message_id })));
  const sb = createServiceClient();
  const { data: deal } = await sb.from("olx_deals").select("id,status,outbox,owner_decision,notes").eq("olx_url", link).maybeSingle();
  if (!deal) {
    await say("Угоду не знайдено в терміналі.");
    return;
  }
  if (["bought", "rejected", "lost"].includes((deal as OlxDeal).status)) {
    if (drop) await clearAway();
    // Say who closed it: the owner's word, or the bot (it drops listings it sent by mistake)
    else {
      const d = deal as OlxDeal;
      await say(
        d.status !== "rejected"
          ? "Угода вже закрита."
          : d.owner_decision
            ? `Вже закрито: ${d.owner_decision}.`
            : `Бот сам відхилив це оголошення${d.notes ? `: ${d.notes}` : " — не наш товар"}.`,
      );
    }
    return;
  }
  const question: OutboxMessage = { id: randomUUID(), text: text.slice(0, 1000), at: now, sent_at: null };
  const { error } = await sb
    .from("olx_deals")
    .update(word ? { ...word, updated_at: now } : { outbox: [...((deal as OlxDeal).outbox || []), question], updated_at: now })
    .eq("id", (deal as OlxDeal).id);
  if (error) {
    await say("Не вдалося зберегти, спробуйте в терміналі.");
    return;
  }
  if (drop) {
    await clearAway();
    return;
  }
  await say(!word ? "✉️ Бот надішле продавцю." : word.status === "rejected" ? "⏭ Пропускаємо." : `✅ ${word.owner_decision} грн — передано боту.`);
}
