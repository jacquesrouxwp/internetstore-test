/**
 * Notify customer on order status change (Telegram + optional Resend email).
 */
import type { Order, OrderStatus } from "@/types";
import {
  applyTemplate,
  getSetting,
  type NotifyTemplates,
} from "@/lib/store-settings";
import { ORDER_STATUS_LABELS } from "@/lib/admin/constants";

async function sendTelegramText(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        cache: "no-store",
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function sendResendEmail(
  to: string,
  subject: string,
  text: string
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM || "Pro-Optics <onboarding@resend.dev>";
  if (!key || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
      }),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function notifyCustomerStatus(
  order: Order,
  status: OrderStatus
): Promise<{ telegram: boolean; email: boolean; message: string }> {
  const templates = await getSetting<NotifyTemplates>("notify_templates");
  const tpl =
    templates[status] ||
    `Статус замовлення {orderNumber}: ${ORDER_STATUS_LABELS[status]}`;
  const message = applyTemplate(tpl, {
    orderNumber: order.orderNumber,
    trackingNumber: order.trackingNumber || "—",
    trackingUrl: order.trackingUrl || "",
    customerName: order.customerName,
    status: ORDER_STATUS_LABELS[status],
  });

  // Store chat gets a copy (manager visibility)
  const tgAdmin = await sendTelegramText(
    `📦 <b>Статус #${order.orderNumber}</b>\n${ORDER_STATUS_LABELS[status]}\n\n${message.replace(/</g, "")}`
  );

  let email = false;
  if (order.customerEmail) {
    email = await sendResendEmail(
      order.customerEmail,
      `Замовлення ${order.orderNumber}: ${ORDER_STATUS_LABELS[status]}`,
      message
    );
  }

  return { telegram: tgAdmin, email, message };
}
