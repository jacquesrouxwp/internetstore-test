/**
 * OLX terminal — shared shapes and arithmetic. The owner prices every model
 * by the state of the item: new with box and documents, new without them,
 * 9/10, 8/10… Each state has its own range: the bot opens at "від" and may
 * go up to "до"; a tick "наш ОК" makes it wait for the owner instead of
 * buying (and sending our address) by itself.
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
  /** Condition out of 10, 10 = new, never used */
  grade: number | null;
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

/** The states the owner prices a model by, best first. */
export const OLX_TIERS = [
  { key: "new_full", label: "Нове, коробка + документи" },
  { key: "new_bare", label: "Нове, без коробки чи документів" },
  { key: "g9", label: "9/10" },
  { key: "g8", label: "8/10" },
  { key: "g7", label: "7/10" },
  { key: "g6", label: "6/10 і нижче" },
] as const;
export type OlxTierKey = (typeof OLX_TIERS)[number]["key"];
export const TIER_LABEL = Object.fromEntries(OLX_TIERS.map((t) => [t.key, t.label])) as Record<OlxTierKey, string>;

/** One state's range: the bot opens at `from`, goes no higher than `to`; `needs_ok` = only with the owner's ок. */
export type OlxTier = { from: number | null; to: number | null; needs_ok: boolean };

export type OlxModel = {
  id: string;
  name: string;
  /** Our catalogue product this price list belongs to, when it is one */
  product_slug: string | null;
  brand: string | null;
  category: string | null;
  /** Other ways sellers and bots write it */
  aliases: string[];
  tiers: Partial<Record<OlxTierKey, OlxTier>>;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
};

export type BuyPrices = {
  model_id: string;
  model_name: string;
  /** Which of the model's states this item is in; null until the bot knows */
  tier: OlxTierKey | null;
  tier_label: string | null;
  /** The bot's opening offer */
  from: number | null;
  /** The most the bot may pay */
  to: number | null;
  /** Even within the range, only with the owner's ок */
  needs_ok: boolean;
  /** What the bot still has to find out before it may buy */
  unknown: string[];
  /** No price for this state, or a defect: the owner decides every time */
  owner_only: boolean;
};

/** The state an item is in, from what the seller says, and what is still to ask. */
export function tierFor(d: Pick<OlxDeal, "condition" | "grade" | "has_box" | "has_docs">): { tier: OlxTierKey | null; unknown: string[] } {
  const isNew = d.grade === 10 || (d.grade == null && d.condition === "new");
  if (isNew) {
    const unknown = [d.has_box == null ? "коробка" : "", d.has_docs == null ? "документи" : ""].filter(Boolean);
    // Without a word on the box or the documents, priced as without them
    return { tier: d.has_box === true && d.has_docs === true ? "new_full" : "new_bare", unknown };
  }
  if (d.grade == null) return { tier: null, unknown: ["стан (оцінка з 10)"] };
  return { tier: d.grade >= 9 ? "g9" : d.grade === 8 ? "g8" : d.grade === 7 ? "g7" : "g6", unknown: [] };
}

/** This item's range from its model's price list and what the seller says. */
export function buyPrices(
  m: OlxModel | null | undefined,
  d: Pick<OlxDeal, "condition" | "grade" | "has_box" | "has_docs">,
): BuyPrices | null {
  if (!m) return null;
  const { tier, unknown } = tierFor(d);
  const t = tier ? m.tiers?.[tier] : undefined;
  const priced = Boolean(t?.to);
  return {
    model_id: m.id,
    model_name: m.name,
    tier,
    tier_label: tier ? TIER_LABEL[tier] : null,
    from: priced ? t!.from || t!.to : null,
    to: priced ? t!.to : null,
    needs_ok: Boolean(t?.needs_ok),
    unknown,
    owner_only: d.condition === "defect" || (tier != null && !priced),
  };
}

/** One of our products, for pricing its buy-ups in the price list. */
export type CatalogItem = { slug: string; name: string; brand: string; category: string; price: number };

/** A deal as the terminal, the bots and Telegram see it: with its prices for this item. */
export type TerminalDeal = OlxDeal & { buy: BuyPrices | null };

/** Where a price sits: within the range the bot buys (or asks you, if ticked), above it is out. */
export function zone(price: number | null | undefined, b: BuyPrices | null | undefined): "good" | "owner" | "out" | null {
  if (!b || !price || !b.to) return null;
  if (price > b.to) return "out";
  return b.needs_ok || b.owner_only || b.unknown.length ? "owner" : "good";
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

/** 1–10 from 8, "8/10", "8 з 10"; anything else is not known. */
function parseGrade(v: unknown): number | null {
  const n = Number(String(v ?? "").trim().split(/[\s/]/)[0].replace(",", "."));
  return Number.isFinite(n) && n >= 1 && n <= 10 ? Math.round(n) : null;
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
  Pick<OlxDeal, "title" | "seller_name" | "city" | "listed_at" | "product_slug" | "model_id" | "model" | "condition" | "grade" | "has_box" | "has_docs" | "kit" | "condition_notes" | "asking_price" | "our_offer" | "bargain_at" | "final_price" | "status" | "notes">
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
  if ("grade" in body) p.grade = parseGrade(body.grade);
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

// Words in brackets are article codes and brand aliases: "INFIRAY (IRAY)", "(HM-TR13-35XF/W-TH35)"
const core = (s: string) =>
  Array.from(new Set(modelTokens(s.replace(/\([^)]*\)/g, " ")).filter((w) => !GENERIC_WORDS.has(w)))).sort().join(" ");

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
