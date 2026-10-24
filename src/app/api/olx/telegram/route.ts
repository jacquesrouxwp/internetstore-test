import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, hasServiceSupabase } from "@/lib/supabase/service";
import { ownerDecision, type OlxDeal } from "@/lib/olx-terminal";
import { isOwnerChat, tg, webhookSecret } from "@/lib/olx-telegram";

/**
 * Webhook of the OLX terminal's Telegram bot: Ок / Ні presses from the owner,
 * and /start, which tells whoever writes their chat id (to set OLX_TG_CHAT_ID).
 */

export const dynamic = "force-dynamic";

type Update = {
  message?: { chat: { id: number }; text?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number }; message_id: number; text?: string } };
};

const uah = (n: number) => new Intl.NumberFormat("uk-UA").format(n);

export async function POST(req: NextRequest) {
  const secret = webhookSecret();
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const u = (await req.json().catch(() => ({}))) as Update;

  if (u.message) {
    const chat = u.message.chat.id;
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
