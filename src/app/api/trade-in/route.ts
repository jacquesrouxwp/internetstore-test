import { NextRequest, NextResponse } from "next/server";
import { uploadProductImage } from "@/lib/admin/storage";
import {
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  formatTradeInTelegramHtml,
  validateTradeIn,
  type TradeInRequest,
} from "@/lib/trade-in";

/**
 * POST /api/trade-in — a seller offers us their device.
 *
 * Public by necessity, so it is written defensively: a honeypot field, a small
 * per-IP budget, hard caps on photo count and size, and images accepted only
 * by their content type. The request goes to Telegram, where the consultant
 * already reads orders; nothing is stored beyond the photos themselves.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Per-IP budget. Serverless recycles instances, so this thins floods rather than stopping a determined one. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const seen = new Map<string, number[]>();

function overBudget(ip: string): boolean {
  const now = Date.now();
  const hits = (seen.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  seen.set(ip, hits);
  if (seen.size > 5000) seen.clear(); // keep the map from growing unbounded
  return hits.length > MAX_PER_WINDOW;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function notifyTelegram(html: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[trade-in] TELEGRAM_BOT_TOKEN/CHAT_ID not set — request only logged");
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
      console.error("[trade-in] telegram", res.status, (await res.text()).slice(0, 300));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[trade-in] telegram error", e);
    return false;
  }
}

export async function POST(req: NextRequest) {
  if (overBudget(clientIp(req))) {
    return NextResponse.json(
      { error: "Забагато заявок поспіль. Спробуйте за кілька хвилин або зателефонуйте." },
      { status: 429 },
    );
  }

  const contentType = req.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Не вдалося прочитати форму" }, { status: 400 });
  }

  // Bots fill every field they see; a human never sees this one.
  if (String(form.get("website") || "").trim()) {
    return NextResponse.json({ ok: true });
  }

  const raw: Partial<TradeInRequest> = {
    model: String(form.get("model") || ""),
    productSlug: String(form.get("productSlug") || "") || null,
    newPrice: Number(form.get("newPrice")) || null,
    condition: String(form.get("condition") || "") as TradeInRequest["condition"],
    extras: form.getAll("extras").map(String) as TradeInRequest["extras"],
    defects: form.getAll("defects").map(String) as TradeInRequest["defects"],
    askingPrice: form.get("askingPrice") as unknown as number,
    comment: String(form.get("comment") || ""),
    name: String(form.get("name") || ""),
    phone: String(form.get("phone") || ""),
    contactVia: String(form.get("contactVia") || "") || null,
  };

  const checked = validateTradeIn(raw);
  if (!checked.ok || !checked.value) {
    return NextResponse.json({ errors: checked.errors }, { status: 422 });
  }

  const files = form
    .getAll("photos")
    .filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f)
    .slice(0, MAX_PHOTOS);

  const photoUrls: string[] = [];
  const folder = `trade-in/${new Date().toISOString().slice(0, 10)}`;
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    if (file.size > MAX_PHOTO_BYTES) continue;
    const url = await uploadProductImage(file, file.name || "photo.jpg", folder);
    if (url) photoUrls.push(url);
  }

  const request: TradeInRequest = { ...checked.value, photoUrls };
  const delivered = await notifyTelegram(formatTradeInTelegramHtml(request));

  if (!delivered) {
    // The lead must not vanish just because Telegram is down.
    console.error("[trade-in] UNDELIVERED REQUEST", JSON.stringify(request));
  }

  return NextResponse.json({ ok: true, photos: photoUrls.length });
}
