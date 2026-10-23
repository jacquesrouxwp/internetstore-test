/**
 * OLX terminal — shared shapes and arithmetic. The owner buys used devices
 * at 20–35 % of what the same model costs new in our shop; every price in the
 * terminal is shown against that new price (N).
 */

export const OLX_STATUSES = ["new", "negotiating", "needs_ok", "bought", "rejected", "lost"] as const;
export type OlxStatus = (typeof OLX_STATUSES)[number];

export const STATUS_LABEL: Record<OlxStatus, string> = {
  new: "Нове",
  negotiating: "Торгуємось",
  needs_ok: "Чекає ок",
  bought: "Куплено",
  rejected: "Відмова",
  lost: "Продано іншому",
};

export type ChatMessage = { at: string; from: "us" | "seller"; text: string };

/** Written by the owner in the terminal, waiting for a bot to send it to the seller. */
export type OutboxMessage = { id: string; text: string; at: string; sent_at: string | null };

export type OlxDeal = {
  id: string;
  olx_url: string;
  title: string | null;
  seller_name: string | null;
  city: string | null;
  /** When the seller published the listing on OLX */
  listed_at: string | null;
  product_slug: string | null;
  model: string | null;
  asking_price: number | null;
  our_offer: number | null;
  bargain_at: number | null;
  final_price: number | null;
  status: OlxStatus;
  owner_decision: string | null;
  owner_decision_at: string | null;
  notes: string | null;
  chat: ChatMessage[];
  outbox: OutboxMessage[];
  /** Owner pressed "оновити": a bot should re-read this chat on OLX */
  refresh_requested_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Target and ceiling of a buy, from our price for the same model new. */
export const BUY_TARGET = 0.2;
export const BUY_CEILING = 0.35;

export function priceWindow(newPrice: number | null | undefined) {
  if (!newPrice || newPrice <= 0) return null;
  const r100 = (x: number) => Math.round(x / 100) * 100;
  return { newPrice, target: r100(newPrice * BUY_TARGET), ceiling: r100(newPrice * BUY_CEILING) };
}

/** Share of the new price, e.g. 0.27 → "27%". */
export function pctOfNew(price: number | null | undefined, newPrice: number | null | undefined): string {
  if (!price || !newPrice) return "";
  return `${Math.round((price / newPrice) * 100)}%`;
}

/** Where a price sits: ≤ target is good, ≤ ceiling needs the owner, above is out. */
export function zone(price: number | null | undefined, newPrice: number | null | undefined): "good" | "owner" | "out" | null {
  const w = priceWindow(newPrice);
  if (!w || !price) return null;
  if (price <= w.target) return "good";
  if (price <= w.ceiling) return "owner";
  return "out";
}

const int = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.round(Number(String(v).replace(/[^\d.]/g, "")));
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const str = (v: unknown, max: number): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

/** Only OLX.ua listing links are accepted — the terminal is not a general bin. */
export function normalizeOlxUrl(raw: unknown): string | null {
  const s = str(raw, 600);
  if (!s) return null;
  try {
    const u = new URL(s);
    if (!/(^|\.)olx\.ua$/i.test(u.hostname)) return null;
    return `https://www.olx.ua${u.pathname}`.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export type DealPatch = Partial<
  Pick<OlxDeal, "title" | "seller_name" | "city" | "listed_at" | "product_slug" | "model" | "asking_price" | "our_offer" | "bargain_at" | "final_price" | "status" | "notes">
>;

/** Fields a bot may set; anything else in the body is ignored. */
export function parseDealPatch(body: Record<string, unknown>): DealPatch {
  const p: DealPatch = {};
  if ("title" in body) p.title = str(body.title, 300);
  if ("seller_name" in body) p.seller_name = str(body.seller_name, 120);
  if ("city" in body) p.city = str(body.city, 120);
  if ("listed_at" in body) {
    const t = body.listed_at ? Date.parse(String(body.listed_at)) : NaN;
    p.listed_at = Number.isNaN(t) ? null : new Date(t).toISOString();
  }
  if ("product_slug" in body) p.product_slug = str(body.product_slug, 200);
  if ("model" in body) p.model = str(body.model, 200);
  if ("asking_price" in body) p.asking_price = int(body.asking_price);
  if ("our_offer" in body) p.our_offer = int(body.our_offer);
  if ("bargain_at" in body) p.bargain_at = int(body.bargain_at);
  if ("final_price" in body) p.final_price = int(body.final_price);
  if ("notes" in body) p.notes = str(body.notes, 2000);
  if ("status" in body && OLX_STATUSES.includes(body.status as OlxStatus)) p.status = body.status as OlxStatus;
  return p;
}

/** Words of a model name: lower case, "E6 +" glued to "E6+", punctuation dropped. */
export function modelTokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/\s+\+/g, "+")
    .split(/[^a-z0-9а-яіїєґ+.]+/i)
    .map((t) => t.replace(/^\.+|\.+$/g, ""))
    .filter(Boolean);
}

/** Words with digits ("L325", "E6", "V3") to pre-filter the catalogue with, all at once. */
export function catalogSearchTokens(model: string): string[] {
  const words = modelTokens(model).map((w) => w.replace(/\+$/, ""));
  const withDigits = words.filter((w) => /\d/.test(w) && w.length > 1);
  const picked = withDigits.length ? withDigits : words.sort((a, b) => b.length - a.length).slice(0, 1);
  return picked.slice(0, 3);
}

/** Words a catalogue name may carry beyond the model itself. */
const GENERIC_WORDS = new Set([
  "тепловізор", "тепловізійний", "тепловізійна", "тепловізонна", "тепловізійні", "приціл", "пріціл", "насадка",
  "монокуляр", "бінокль", "прилад", "нічного", "бачення", "цифровий", "сша", "iray", "infiray", "hikmicro",
  "pulsar", "agm", "atn", "pard", "guide", "thermtec", "nocpix", "dahua", "sytong", "armasight", "dipol",
  "nvectech", "leonardo", "drs", "yukon", "flir", "conotech", "arkon",
]);

/**
 * The catalogue product a model name means, or null. Every word of the model
 * must be a whole word of the product name, in any order: the catalogue says
 * "INFIRAY (IRAY) Tyke L325" and "XEYE 2 E6 + V3", bots write "InfiRay Tyke
 * L325" and "XEYE 2 E6+ V3". Whole words keep "LYNX Pro LE10" off "LE10S"
 * (that mix-up showed a wrong new price, October 2026), and the name may add
 * only generic words, so "RICO RH50" is not "RICO RH50 V2" and "PVS-14" is
 * not a mount "для PVS-14".
 */
export function pickCatalogMatch(model: string, candidates: { slug: string; name_uk: string }[]): string | null {
  const want = modelTokens(model);
  if (!want.length) return null;
  // The product may only add generic words (type, brand); anything else —
  // "кріплення WILCOX L4 для PVS-14", "PVS-14 NL1" — means it is a different item
  const hits = candidates
    .map((c) => ({ c, have: modelTokens(c.name_uk) }))
    .filter(({ have }) => want.every((w) => have.includes(w)))
    .filter(({ have }) => have.every((w) => want.includes(w) || GENERIC_WORDS.has(w)));
  return hits.length === 1 ? hits[0].c.slug : null;
}

/** New chat lines from a bot: { from: "us" | "seller", text, at? }. */
export function parseMessages(raw: unknown): ChatMessage[] {
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const out: ChatMessage[] = [];
  for (const m of list.slice(0, 50)) {
    if (!m || typeof m !== "object") continue;
    const r = m as Record<string, unknown>;
    const from = r.from === "seller" ? "seller" : r.from === "us" ? "us" : null;
    const text = str(r.text, 2000);
    if (!from || !text) continue;
    const at = r.at && !Number.isNaN(Date.parse(String(r.at))) ? new Date(String(r.at)).toISOString() : new Date().toISOString();
    out.push({ at, from, text });
  }
  return out;
}
