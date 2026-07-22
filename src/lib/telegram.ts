import type { Order, PaymentMethod } from "@/types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function paymentLabel(method: PaymentMethod | string): string {
  switch (method) {
    case "cod":
      return "Накладений платіж (при отриманні)";
    case "monobank":
      return "Monobank";
    case "liqpay":
      return "LiqPay";
    case "wayforpay":
      return "WayForPay";
    default:
      return String(method);
  }
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: 0,
  }).format(n);
}

/** Digits (and leading +) for tel: href */
function telHref(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+") ? cleaned : cleaned.replace(/^\+?/, "");
}

/**
 * Build HTML body for Telegram order notification.
 * Server-only — never import from client components.
 */
export function formatOrderTelegramHtml(order: Order): string {
  const phone = order.customerPhone || "";
  const phoneLink = phone
    ? `<a href="tel:${escapeHtml(telHref(phone))}">${escapeHtml(phone)}</a>`
    : "—";

  const lines: string[] = [
    `🛒 <b>Новий заказ #${escapeHtml(order.orderNumber)}</b>`,
    "",
    `👤 <b>Ім'я:</b> ${escapeHtml(order.customerName)}`,
    `📞 <b>Телефон:</b> ${phoneLink}`,
  ];

  if (order.customerEmail) {
    lines.push(
      `✉️ <b>Email:</b> ${escapeHtml(order.customerEmail)}`
    );
  }

  lines.push("", "📦 <b>Товари:</b>");

  const items = order.items || [];
  if (items.length) {
    for (const item of items) {
      const lineTotal = item.price * item.quantity;
      lines.push(
        `• ${escapeHtml(item.productName)} ×${item.quantity} — ${formatMoney(lineTotal)} грн`
      );
    }
  } else {
    lines.push("• —");
  }

  lines.push(
    "",
    `💰 <b>Разом:</b> ${formatMoney(order.total)} грн`
  );

  const city = order.npCityName || "—";
  const wh = order.npWarehouseName || "—";
  lines.push(
    `🚚 <b>Доставка:</b> Нова Пошта, ${escapeHtml(city)}, ${escapeHtml(wh)}`
  );
  // Refs help support match warehouse in NP cabinet if needed
  if (order.npCityRef || order.npWarehouseRef) {
    lines.push(
      `<i>Ref: ${escapeHtml(order.npCityRef || "—")} / ${escapeHtml(order.npWarehouseRef || "—")}</i>`
    );
  }
  lines.push(`💳 <b>Оплата:</b> ${escapeHtml(paymentLabel(order.paymentMethod))}`);

  if (order.comment) {
    lines.push(`💬 <b>Коментар:</b> ${escapeHtml(order.comment)}`);
  }

  const when = new Date(order.createdAt || Date.now()).toLocaleString("uk-UA", {
    timeZone: "Europe/Kyiv",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  lines.push("", `🕐 ${when}`);

  return lines.join("\n");
}

/**
 * Send order notification to Telegram group/chat.
 * Failures are logged and never thrown — order flow must stay OK.
 */
export async function sendOrderToTelegram(order: Order): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn(
      "[telegram] TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set — skip notify"
    );
    return;
  }

  try {
    const text = formatOrderTelegramHtml(order);
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
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        "[telegram] sendMessage failed:",
        res.status,
        body.slice(0, 500)
      );
    }
  } catch (err) {
    console.error("[telegram] notify error:", err);
  }
}
