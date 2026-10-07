/**
 * Premium optics to order: brands the catalogue does not carry.
 *
 * The page sells nothing directly. It names the European makers people search
 * for — Swarovski, ZEISS, Leica and the rest — and takes a request for a
 * specific model; a consultant then sources it and calls back with a price
 * and a delivery time. Nothing here states a price, a delivery time or an
 * official dealership: those depend on each order, and a promise the shop
 * cannot keep is exactly what Merchant Center has already penalised once
 * ("Искажение фактов", September 2026).
 */

import type { Locale } from "@/types";
import { normalizePhone } from "@/lib/trade-in";

export const PREMIUM_CATEGORIES = [
  "thermal",
  "binoculars",
  "sights",
  "rangefinders",
  "spotting",
  "other",
] as const;
export type PremiumCategory = (typeof PREMIUM_CATEGORIES)[number];

type Tri = { uk: string; ru: string; en: string };

export const CATEGORY_LABEL: Record<PremiumCategory, Tri> = {
  thermal: { uk: "Тепловізор", ru: "Тепловизор", en: "Thermal imager" },
  binoculars: { uk: "Бінокль", ru: "Бинокль", en: "Binoculars" },
  sights: { uk: "Приціл", ru: "Прицел", en: "Riflescope" },
  rangefinders: { uk: "Далекомір", ru: "Дальномер", en: "Rangefinder" },
  spotting: { uk: "Зорова труба", ru: "Зрительная труба", en: "Spotting scope" },
  other: { uk: "Інше", ru: "Другое", en: "Other" },
};

export interface PremiumBrand {
  name: string;
  country: Tri;
  /** What the maker is known for — only lines that exist, no claims of rank. */
  lines: Tri;
  categories: PremiumCategory[];
}

/**
 * European makers first, then a short list from the US. Product lines are
 * named only where they are long-standing and well known; when unsure, the
 * entry says what the maker makes instead of naming a model.
 */
export const PREMIUM_BRANDS: PremiumBrand[] = [
  {
    name: "Swarovski Optik",
    country: { uk: "Австрія", ru: "Австрия", en: "Austria" },
    lines: {
      uk: "біноклі EL і NL Pure, приціли Z8i, зорові труби ATX і STX, тепловізійна оптика",
      ru: "бинокли EL и NL Pure, прицелы Z8i, зрительные трубы ATX и STX, тепловизионная оптика",
      en: "EL and NL Pure binoculars, Z8i riflescopes, ATX and STX spotting scopes, thermal optics",
    },
    categories: ["binoculars", "sights", "spotting", "thermal"],
  },
  {
    name: "ZEISS",
    country: { uk: "Німеччина", ru: "Германия", en: "Germany" },
    lines: {
      uk: "біноклі Victory SF і Conquest, приціли Victory V8, тепловізори DTI",
      ru: "бинокли Victory SF и Conquest, прицелы Victory V8, тепловизоры DTI",
      en: "Victory SF and Conquest binoculars, Victory V8 riflescopes, DTI thermal imagers",
    },
    categories: ["binoculars", "sights", "thermal", "rangefinders"],
  },
  {
    name: "Leica",
    country: { uk: "Німеччина", ru: "Германия", en: "Germany" },
    lines: {
      uk: "біноклі Noctivid і Ultravid, біноклі-далекоміри Geovid, тепловізор Calonox, далекоміри Rangemaster",
      ru: "бинокли Noctivid и Ultravid, бинокли-дальномеры Geovid, тепловизор Calonox, дальномеры Rangemaster",
      en: "Noctivid and Ultravid binoculars, Geovid rangefinding binoculars, Calonox thermal imager, Rangemaster rangefinders",
    },
    categories: ["binoculars", "rangefinders", "thermal"],
  },
  {
    name: "Steiner",
    country: { uk: "Німеччина", ru: "Германия", en: "Germany" },
    lines: {
      uk: "морські та мисливські біноклі, тепловізійна оптика",
      ru: "морские и охотничьи бинокли, тепловизионная оптика",
      en: "marine and hunting binoculars, thermal optics",
    },
    categories: ["binoculars", "thermal"],
  },
  {
    name: "Kahles",
    country: { uk: "Австрія", ru: "Австрия", en: "Austria" },
    lines: {
      uk: "приціли та біноклі Helia",
      ru: "прицелы и бинокли Helia",
      en: "Helia riflescopes and binoculars",
    },
    categories: ["sights", "binoculars"],
  },
  {
    name: "Schmidt & Bender",
    country: { uk: "Німеччина", ru: "Германия", en: "Germany" },
    lines: {
      uk: "приціли Exos і PM II",
      ru: "прицелы Exos и PM II",
      en: "Exos and PM II riflescopes",
    },
    categories: ["sights"],
  },
  {
    name: "Liemke",
    country: { uk: "Німеччина", ru: "Германия", en: "Germany" },
    lines: {
      uk: "тепловізійні монокуляри Keiler і Merlin",
      ru: "тепловизионные монокуляры Keiler и Merlin",
      en: "Keiler and Merlin thermal monoculars",
    },
    categories: ["thermal"],
  },
  {
    name: "Meopta",
    country: { uk: "Чехія", ru: "Чехия", en: "Czech Republic" },
    lines: {
      uk: "біноклі та приціли MeoStar",
      ru: "бинокли и прицелы MeoStar",
      en: "MeoStar binoculars and riflescopes",
    },
    categories: ["binoculars", "sights"],
  },
  {
    name: "Minox",
    country: { uk: "Німеччина", ru: "Германия", en: "Germany" },
    lines: {
      uk: "біноклі та приціли",
      ru: "бинокли и прицелы",
      en: "binoculars and riflescopes",
    },
    categories: ["binoculars", "sights"],
  },
  {
    name: "GPO German Precision Optics",
    country: { uk: "Німеччина", ru: "Германия", en: "Germany" },
    lines: {
      uk: "біноклі Passion, приціли",
      ru: "бинокли Passion, прицелы",
      en: "Passion binoculars, riflescopes",
    },
    categories: ["binoculars", "sights"],
  },
  {
    name: "Docter",
    country: { uk: "Німеччина", ru: "Германия", en: "Germany" },
    lines: {
      uk: "біноклі та приціли",
      ru: "бинокли и прицелы",
      en: "binoculars and riflescopes",
    },
    categories: ["binoculars", "sights"],
  },
  {
    name: "Kite Optics",
    country: { uk: "Бельгія", ru: "Бельгия", en: "Belgium" },
    lines: {
      uk: "біноклі та зорові труби",
      ru: "бинокли и зрительные трубы",
      en: "binoculars and spotting scopes",
    },
    categories: ["binoculars", "spotting"],
  },
  {
    name: "Opticron",
    country: { uk: "Велика Британія", ru: "Великобритания", en: "United Kingdom" },
    lines: {
      uk: "біноклі та зорові труби",
      ru: "бинокли и зрительные трубы",
      en: "binoculars and spotting scopes",
    },
    categories: ["binoculars", "spotting"],
  },
];

/** Premium makers from the US — on request too, kept to a short line on the page. */
export const PREMIUM_BRANDS_US = ["Leupold", "Nightforce", "Trijicon"];

export function brandsFor(category: PremiumCategory): PremiumBrand[] {
  return PREMIUM_BRANDS.filter((b) => b.categories.includes(category));
}

export interface PremiumOrder {
  category: PremiumCategory;
  /** A brand from the list or whatever the buyer typed. */
  brand: string | null;
  /** The model they want — free text, the one field we cannot do without. */
  model: string;
  /** Budget in UAH, if they named one. */
  budget: number | null;
  comment: string | null;
  name: string;
  phone: string;
  contactVia: string | null;
  locale: Locale;
  createdAt: string;
}

export const MAX_COMMENT = 1500;

export interface PremiumValidation {
  ok: boolean;
  errors: Record<string, string>;
  value?: PremiumOrder;
}

const MESSAGES: Record<Locale, Record<string, string>> = {
  uk: {
    category: "Оберіть, що шукаєте",
    model: "Вкажіть модель або що саме потрібно",
    name: "Вкажіть ім'я",
    phone: "Вкажіть телефон у форматі 0XX XXX XX XX",
    budget: "Бюджет має бути числом",
  },
  ru: {
    category: "Выберите, что ищете",
    model: "Укажите модель или что именно нужно",
    name: "Укажите имя",
    phone: "Укажите телефон в формате 0XX XXX XX XX",
    budget: "Бюджет должен быть числом",
  },
  en: {
    category: "Choose what you are looking for",
    model: "Name the model or what exactly you need",
    name: "Enter your name",
    phone: "Enter a Ukrainian phone number, 0XX XXX XX XX",
    budget: "The budget must be a number",
  },
};

/**
 * Checks a request. Anything we could not act on is refused: without a model
 * and a working phone it is not a lead.
 */
export function validatePremiumOrder(input: Record<string, unknown>): PremiumValidation {
  const locale: Locale =
    input.locale === "ru" || input.locale === "en" ? (input.locale as Locale) : "uk";
  const msg = MESSAGES[locale];
  const errors: Record<string, string> = {};

  const category = String(input.category || "") as PremiumCategory;
  if (!PREMIUM_CATEGORIES.includes(category)) errors.category = msg.category;

  const model = String(input.model || "").trim().slice(0, 200);
  if (model.length < 2) errors.model = msg.model;

  const name = String(input.name || "").trim().slice(0, 100);
  if (name.length < 2) errors.name = msg.name;

  const phone = normalizePhone(String(input.phone || ""));
  if (!phone) errors.phone = msg.phone;

  let budget: number | null = null;
  const budgetRaw = input.budget;
  if (budgetRaw !== undefined && budgetRaw !== null && String(budgetRaw).trim() !== "") {
    const n = Number(String(budgetRaw).replace(/[^\d]/g, ""));
    if (!Number.isFinite(n) || n <= 0 || n > 50_000_000) errors.budget = msg.budget;
    else budget = n;
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  const brand = String(input.brand || "").trim().slice(0, 80) || null;
  return {
    ok: true,
    errors: {},
    value: {
      category,
      brand,
      model,
      budget,
      comment: String(input.comment || "").trim().slice(0, MAX_COMMENT) || null,
      name,
      phone: phone as string,
      contactVia: input.contactVia ? String(input.contactVia).slice(0, 40) : null,
      locale,
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

/** The message the consultant reads in Telegram. */
export function formatPremiumOrderTelegramHtml(o: PremiumOrder): string {
  const money = (n: number) =>
    new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 0 }).format(n);
  const lines = [
    "💎 <b>Під замовлення: преміальна оптика</b>",
    "",
    `📂 <b>Що шукає:</b> ${CATEGORY_LABEL[o.category].uk}`,
  ];
  if (o.brand) lines.push(`🏷 <b>Бренд:</b> ${escapeHtml(o.brand)}`);
  lines.push(`🔭 <b>Модель:</b> ${escapeHtml(o.model)}`);
  lines.push(o.budget ? `💰 <b>Бюджет:</b> до ${money(o.budget)} грн` : "💰 <i>Бюджет не вказав</i>");
  if (o.comment) lines.push("", `💬 ${escapeHtml(o.comment)}`);

  const telHref = o.phone.replace(/[^\d+]/g, "");
  lines.push(
    "",
    `👤 <b>${escapeHtml(o.name)}</b>`,
    `📞 <a href="tel:${escapeHtml(telHref)}">${escapeHtml(o.phone)}</a>`,
  );
  if (o.contactVia) lines.push(`💬 <b>Зручно:</b> ${escapeHtml(o.contactVia)}`);
  if (o.locale !== "uk") lines.push(`🌐 <b>Мова сайту:</b> ${o.locale.toUpperCase()}`);

  const when = new Date(o.createdAt).toLocaleString("uk-UA", {
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
