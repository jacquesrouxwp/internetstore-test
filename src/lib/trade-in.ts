/**
 * Trade-in requests: what the seller tells us about their device.
 *
 * The shop does not quote a price here, the seller names one. That is the
 * whole point of the form: a number we invent becomes a promise we have to
 * keep, while a number they name is the start of a negotiation — and it
 * arrives already qualified, with photos, so the consultant can answer yes or
 * no without a round of questions.
 *
 * The catalogue price of the same model new is carried along as a reference
 * for the consultant. It is never presented to the seller as an offer.
 */

export const CONDITIONS = ["new", "excellent", "good", "used", "faulty"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const EXTRAS = ["box", "docs", "case", "charger", "warranty"] as const;
export type Extra = (typeof EXTRAS)[number];

export const DEFECTS = ["optics", "body", "battery", "electronics", "none"] as const;
export type Defect = (typeof DEFECTS)[number];

export interface TradeInRequest {
  /** Free text — the seller may own something we do not stock. */
  model: string;
  /** Catalogue slug when they picked a model from the list. */
  productSlug?: string | null;
  /** What the same model new costs in our catalogue, for the consultant. */
  newPrice?: number | null;
  condition: Condition;
  extras: Extra[];
  defects: Defect[];
  /** What the seller wants for it, in UAH. */
  askingPrice?: number | null;
  comment?: string | null;
  name: string;
  phone: string;
  contactVia?: string | null;
  photoUrls: string[];
  createdAt?: string;
}

export const MAX_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
export const MAX_COMMENT = 1500;

const LABELS_UK: Record<string, string> = {
  new: "як новий",
  excellent: "дуже добрий",
  good: "добрий",
  used: "робочий, зі слідами",
  faulty: "несправний",
  box: "коробка",
  docs: "документи",
  case: "чохол",
  charger: "зарядка",
  warranty: "гарантія діє",
  optics: "оптика",
  body: "корпус",
  battery: "акумулятор",
  electronics: "електроніка",
  none: "немає",
};

const LABELS_RU: Record<string, string> = {
  new: "как новый",
  excellent: "очень хороший",
  good: "хороший",
  used: "рабочий, со следами",
  faulty: "неисправный",
  box: "коробка",
  docs: "документы",
  case: "чехол",
  charger: "зарядка",
  warranty: "гарантия действует",
  optics: "оптика",
  body: "корпус",
  battery: "аккумулятор",
  electronics: "электроника",
  none: "нет",
};

export function label(key: string, locale: "uk" | "ru" = "uk"): string {
  return (locale === "ru" ? LABELS_RU : LABELS_UK)[key] || key;
}

/** Ukrainian mobile numbers, however the seller typed them. */
export function normalizePhone(raw: string): string | null {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) return "+38" + digits;
  if (digits.length === 12 && digits.startsWith("380")) return "+" + digits;
  if (digits.length === 11 && digits.startsWith("80")) return "+3" + digits;
  return null;
}

export interface ValidationResult {
  ok: boolean;
  /** Field name → what is wrong, empty when ok. */
  errors: Record<string, string>;
  value?: TradeInRequest;
}

/**
 * Checks a submitted form. Rejects anything we could not act on — a request
 * without a working phone is not a lead, it is noise.
 */
export function validateTradeIn(input: Partial<TradeInRequest>): ValidationResult {
  const errors: Record<string, string> = {};

  const model = String(input.model || "").trim().slice(0, 200);
  if (model.length < 2) errors.model = "Вкажіть модель приладу";

  const condition = input.condition as Condition;
  if (!CONDITIONS.includes(condition)) errors.condition = "Оберіть стан";

  const name = String(input.name || "").trim().slice(0, 100);
  if (name.length < 2) errors.name = "Вкажіть ім'я";

  const phone = normalizePhone(String(input.phone || ""));
  if (!phone) errors.phone = "Вкажіть телефон у форматі 0XX XXX XX XX";

  const askingRaw = input.askingPrice;
  let askingPrice: number | null = null;
  if (askingRaw !== undefined && askingRaw !== null && String(askingRaw) !== "") {
    const n = Number(String(askingRaw).replace(/[^\d]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      errors.askingPrice = "Ціна має бути числом";
    } else if (n > 5_000_000) {
      errors.askingPrice = "Перевірте суму";
    } else {
      askingPrice = n;
    }
  }

  const extras = (Array.isArray(input.extras) ? input.extras : []).filter(
    (e): e is Extra => EXTRAS.includes(e as Extra),
  );
  const defects = (Array.isArray(input.defects) ? input.defects : []).filter(
    (d): d is Defect => DEFECTS.includes(d as Defect),
  );
  const photoUrls = (Array.isArray(input.photoUrls) ? input.photoUrls : [])
    .filter((u) => typeof u === "string" && u.startsWith("https://"))
    .slice(0, MAX_PHOTOS);

  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    errors: {},
    value: {
      model,
      productSlug: input.productSlug ? String(input.productSlug).slice(0, 200) : null,
      newPrice:
        typeof input.newPrice === "number" && input.newPrice > 0
          ? Math.round(input.newPrice)
          : null,
      condition,
      extras,
      defects,
      askingPrice,
      comment: String(input.comment || "").trim().slice(0, MAX_COMMENT) || null,
      name,
      phone: phone as string,
      contactVia: input.contactVia ? String(input.contactVia).slice(0, 40) : null,
      photoUrls,
      createdAt: new Date().toISOString(),
    },
  };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n: number): string {
  return new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(n);
}

/** The message the consultant reads in Telegram. */
export function formatTradeInTelegramHtml(r: TradeInRequest): string {
  const lines: string[] = [
    "🔄 <b>Заявка на викуп / trade-in</b>",
    "",
    `🔭 <b>Модель:</b> ${escapeHtml(r.model)}`,
  ];

  if (r.newPrice) {
    lines.push(`🏷 <i>Нова в каталозі: ${money(r.newPrice)} грн</i>`);
  }

  lines.push(`📋 <b>Стан:</b> ${label(r.condition)}`);

  if (r.extras.length) {
    lines.push(`📦 <b>Комплект:</b> ${r.extras.map((e) => label(e)).join(", ")}`);
  }
  const realDefects = r.defects.filter((d) => d !== "none");
  if (realDefects.length) {
    lines.push(`⚠️ <b>Дефекти:</b> ${realDefects.map((d) => label(d)).join(", ")}`);
  }

  lines.push(
    "",
    r.askingPrice
      ? `💰 <b>Хоче отримати:</b> ${money(r.askingPrice)} грн`
      : "💰 <b>Ціну не вказав</b> — чекає на нашу оцінку",
  );

  if (r.comment) lines.push("", `💬 ${escapeHtml(r.comment)}`);

  if (r.photoUrls.length) {
    lines.push("", `📷 <b>Фото (${r.photoUrls.length}):</b>`);
    r.photoUrls.forEach((u, i) => {
      lines.push(`<a href="${escapeHtml(u)}">фото ${i + 1}</a>`);
    });
  } else {
    lines.push("", "📷 <i>Без фото</i>");
  }

  const telHref = r.phone.replace(/[^\d+]/g, "");
  lines.push(
    "",
    `👤 <b>${escapeHtml(r.name)}</b>`,
    `📞 <a href="tel:${escapeHtml(telHref)}">${escapeHtml(r.phone)}</a>`,
  );
  if (r.contactVia) lines.push(`💬 <b>Зручно:</b> ${escapeHtml(r.contactVia)}`);

  const when = new Date(r.createdAt || Date.now()).toLocaleString("uk-UA", {
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
