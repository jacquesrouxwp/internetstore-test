import { NextRequest, NextResponse } from "next/server";
import { uploadProductImage } from "@/lib/admin/storage";
import {
  MAX_PHOTOS,
  MAX_PHOTO_BYTES,
  formatTradeInTelegramHtml,
  validateTradeIn,
  type TradeInRequest,
} from "@/lib/trade-in";
import { clientIp, createIpBudget, notifyTelegram } from "@/lib/public-form";

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

/** Five requests per IP per ten minutes. */
const overBudget = createIpBudget(5, 10 * 60 * 1000);

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
  const delivered = await notifyTelegram(formatTradeInTelegramHtml(request), "trade-in");

  if (!delivered) {
    // The lead must not vanish just because Telegram is down.
    console.error("[trade-in] UNDELIVERED REQUEST", JSON.stringify(request));
  }

  return NextResponse.json({ ok: true, photos: photoUrls.length });
}
