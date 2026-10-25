/**
 * OLX terminal — shared shapes and arithmetic. Every model has its own buying
 * prices (olx_models, set by the owner): a target the bot may close at, and a
 * ceiling up to which the owner decides. Both move with what the seller says
 * about the item: its condition, whether the box and the documents are there.
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

export const OLX_CONDITIONS = ["new", "like_new", "used", "defect"] as const;
export type OlxCondition = (typeof OLX_CONDITIONS)[number];
export const CONDITION_LABEL: Record<OlxCondition, string> = {
  new: "нове",
  like_new: "як нове",
  used: "б/у, є сліди",
  defect: "дефект / ремонт",
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
  /** The owner's model this deal is priced by; when empty, found by the model name */
  model_id: string | null;
  model: string | null;
  /** What the seller says about the item; null = not asked yet */
  condition: OlxCondition | null;
  has_box: boolean | null;
  has_docs: boolean | null;
  /** What else comes with it: charger, case, batteries… */
  kit: string | null;
  condition_notes: string | null;
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

/** Money the condition moves the model's prices by, in UAH: "new" adds, the rest take off. */
export type OlxAdjust = { new?: number; used?: number; no_box?: number; no_docs?: number };

export type OlxModel = {
  id: string;
  name: string;
  /** Other ways sellers and bots write it */
  aliases: string[];
  category: string | null;
  /** The bot may close at this — for "як нове", with box and documents */
  target_price: number | null;
  /** Up to this the owner decides; above it we pass */
  ceiling_price: number | null;
  adjust: OlxAdjust;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BuyPrices = {
  model_id: string;
  model_name: string;
  target: number;
  ceiling: number;
  /** How the condition moved the model's prices */
  steps: { label: string; amount: number }[];
  /** What the bot still has to ask; priced as the worse case until then */
  unknown: string[];
  /** A defect: no price is safe, the owner decides every time */
  owner_only: boolean;
};

/** Target and ceiling for this item, from its model's prices and what the seller says. */
export function buyPrices(
  m: OlxModel | null | undefined,
  d: Pick<OlxDeal, "condition" | "has_box" | "has_docs">,
): BuyPrices | null {
  if (!m || !m.target_price) return null;
  const a = m.adjust || {};
  const steps: { label: string; amount: number }[] = [];
  const unknown: string[] = [];
  const take = (label: string, v: number | undefined) => {
    if (v) steps.push({ label, amount: -Math.abs(v) });
  };
  if (d.condition === "new" && a.new) steps.push({ label: "нове", amount: Math.abs(a.new) });
  else if (d.condition === "used" || d.condition === "defect") take(CONDITION_LABEL[d.condition], a.used);
  else if (!d.condition) {
    unknown.push("стан");
    take("стан не відомий", a.used);
  }
  if (d.has_box === false) take("без коробки", a.no_box);
  else if (d.has_box == null) {
    unknown.push("коробка");
    take("коробка не відома", a.no_box);
  }
  if (d.has_docs === false) take("без документів", a.no_docs);
  else if (d.has_docs == null) {
    unknown.push("документи");
    take("документи не відомі", a.no_docs);
  }
  const shift = steps.reduce((sum, x) => sum + x.amount, 0);
  const target = Math.max(0, m.target_price + shift);
  const ceiling = Math.max(target, (m.ceiling_price || m.target_price) + shift);
  return { model_id: m.id, model_name: m.name, target, ceiling, steps, unknown, owner_only: d.condition === "defect" };
}

/** A deal as the terminal, the bots and Telegram see it: with its prices for this item. */
export type TerminalDeal = OlxDeal & { buy: BuyPrices | null };

/** Where a price sits: ≤ target the bot closes, ≤ ceiling the owner decides, above is out. */
export function zone(price: number | null | undefined, b: BuyPrices | null | undefined): "good" | "owner" | "out" | null {
  if (!b || !price) return null;
  if (price <= b.target && !b.owner_only) return "good";
  if (price <= b.ceiling) return "owner";
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

/** true / false / null from JSON or words: "так", "є", "ні", "немає". */
function yesNo(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  const t = String(v ?? "").trim().toLowerCase();
  if (["true", "yes", "так", "є", "есть", "да", "1"].includes(t)) return true;
  if (["false", "no", "ні", "немає", "нема", "нет", "0"].includes(t)) return false;
  return null;
}

/** "like_new" or the words a bot may pass: "як нове", "б/у", "дефект". */
function parseCondition(v: unknown): OlxCondition | null {
  const t = String(v ?? "").trim().toLowerCase();
  if ((OLX_CONDITIONS as readonly string[]).includes(t)) return t as OlxCondition;
  if (/дефект|ремонт|розбит|не працю/.test(t)) return "defect";
  if (/як нов|ідеал|идеал|like/.test(t)) return "like_new";
  if (/^нов|^new|не користув/.test(t)) return "new";
  if (/б\/?у|вжив|слід|потерт|used/.test(t)) return "used";
  return null;
}

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
  Pick<OlxDeal, "title" | "seller_name" | "city" | "listed_at" | "product_slug" | "model_id" | "model" | "condition" | "has_box" | "has_docs" | "kit" | "condition_notes" | "asking_price" | "our_offer" | "bargain_at" | "final_price" | "status" | "notes">
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
  if ("model_id" in body) p.model_id = str(body.model_id, 64);
  if ("condition" in body) p.condition = parseCondition(body.condition);
  if ("has_box" in body) p.has_box = yesNo(body.has_box);
  if ("has_docs" in body) p.has_docs = yesNo(body.has_docs);
  if ("kit" in body) p.kit = str(body.kit, 500);
  if ("condition_notes" in body) p.condition_notes = str(body.condition_notes, 1000);
  if ("asking_price" in body) p.asking_price = int(body.asking_price);
  if ("our_offer" in body) p.our_offer = int(body.our_offer);
  if ("bargain_at" in body) p.bargain_at = int(body.bargain_at);
  if ("final_price" in body) p.final_price = int(body.final_price);
  if ("notes" in body) p.notes = str(body.notes, 2000);
  if ("status" in body && OLX_STATUSES.includes(body.status as OlxStatus)) p.status = body.status as OlxStatus;
  return p;
}

/**
 * The owner's word on a deal, from the terminal or from Telegram:
 * "ok" with a price lets the bot close at it, "no" turns the seller down.
 */
export function ownerDecision(decision: unknown, price: unknown, now: string): Partial<OlxDeal> | null {
  if (decision === "ok") {
    const p = Math.round(Number(price));
    if (!Number.isFinite(p) || p <= 0) return null;
    return { owner_decision: `ok ${p}`, owner_decision_at: now, status: "negotiating" };
  }
  if (decision === "no") return { owner_decision: "ні", owner_decision_at: now, status: "rejected" };
  return null;
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

/** Words a model name may carry or lose without becoming another model. */
const GENERIC_WORDS = new Set([
  "тепловізор", "тепловізійний", "тепловізійна", "тепловізонна", "тепловізійні", "приціл", "пріціл", "насадка",
  "монокуляр", "бінокль", "прилад", "нічного", "бачення", "цифровий", "сша", "iray", "infiray", "hikmicro",
  "pulsar", "agm", "atn", "pard", "guide", "thermtec", "nocpix", "dahua", "sytong", "armasight", "dipol",
  "nvectech", "leonardo", "drs", "yukon", "flir", "conotech", "arkon",
]);

const core = (s: string) => Array.from(new Set(modelTokens(s).filter((w) => !GENERIC_WORDS.has(w)))).sort().join(" ");

/**
 * The owner's model a deal's model name means, or null. The words that tell
 * models apart must be the same, in any order — brand and type words aside:
 * "InfiRay Tyke L325" is "Tyke L325", but "LYNX Pro LE10" is not "LE10S"
 * and "RICO RH50" is not "RICO RH50 V2".
 */
export function matchModel<M extends { id: string; name: string; aliases?: string[] | null }>(
  name: string | null | undefined,
  models: M[],
): M | null {
  const want = name ? core(name) : "";
  if (!want) return null;
  const hits = models.filter((m) => [m.name, ...(m.aliases || [])].some((n) => core(n) === want));
  return hits.length === 1 ? hits[0] : null;
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
