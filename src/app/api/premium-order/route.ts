import { NextRequest, NextResponse } from "next/server";
import {
  formatPremiumOrderTelegramHtml,
  validatePremiumOrder,
} from "@/lib/premium-order";
import { clientIp, createIpBudget, notifyTelegram } from "@/lib/public-form";

/**
 * POST /api/premium-order — a request for a premium model we source to order.
 *
 * Public, so defensive in the same way as the trade-in form: a honeypot field
 * and a per-IP budget. The request goes to the consultants' Telegram chat;
 * nothing is stored.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const overBudget = createIpBudget(5, 10 * 60 * 1000);

export async function POST(req: NextRequest) {
  if (overBudget(clientIp(req))) {
    return NextResponse.json(
      { error: "Забагато заявок поспіль. Спробуйте за кілька хвилин або зателефонуйте." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Не вдалося прочитати форму" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Не вдалося прочитати форму" }, { status: 400 });
  }

  // Bots fill every field they see; a human never sees this one.
  if (String(body.website || "").trim()) {
    return NextResponse.json({ ok: true });
  }

  const checked = validatePremiumOrder(body);
  if (!checked.ok || !checked.value) {
    return NextResponse.json({ errors: checked.errors }, { status: 422 });
  }

  const delivered = await notifyTelegram(
    formatPremiumOrderTelegramHtml(checked.value),
    "premium-order",
  );
  if (!delivered) {
    // The lead must not vanish just because Telegram is down.
    console.error("[premium-order] UNDELIVERED REQUEST", JSON.stringify(checked.value));
  }

  return NextResponse.json({ ok: true });
}
