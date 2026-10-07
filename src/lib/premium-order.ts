/**
 * Premium optics to order: brands the catalogue does not carry.
 *
 * The page names the makers people search for — Swarovski, ZEISS, Leica and
 * the rest — with their best-known models, and takes one thing from the
 * buyer: the model they want, plus a name and a phone. A colleague calls
 * back. The page states no prices, no delivery times, no ordering process
 * and no dealership; the owner wants the conversation, not a form that
 * negotiates, and Merchant Center has already penalised a promise the shop
 * could not keep ("Искажение фактов", September 2026).
 *
 * Models are listed only where the name is certain. A brand whose model names
 * we are not sure of gets a card without a list — an invented model on the
 * page would be worse than a missing one.
 */

import type { Locale } from "@/types";
import { normalizePhone } from "@/lib/trade-in";

export const PREMIUM_KINDS = ["thermal", "binoculars", "rangefinders", "sights", "spotting"] as const;
export type PremiumKind = (typeof PREMIUM_KINDS)[number];

type Tri = { uk: string; ru: string; en: string };

/** Group headings inside a brand card — plural, as a shelf label reads. */
export const KIND_LABEL: Record<PremiumKind, Tri> = {
  thermal: { uk: "Тепловізори", ru: "Тепловизоры", en: "Thermal imagers" },
  binoculars: { uk: "Біноклі", ru: "Бинокли", en: "Binoculars" },
  rangefinders: { uk: "Далекоміри", ru: "Дальномеры", en: "Rangefinders" },
  sights: { uk: "Приціли", ru: "Прицелы", en: "Riflescopes" },
  spotting: { uk: "Підзорні труби", ru: "Подзорные трубы", en: "Spotting scopes" },
};

export interface PremiumBrand {
  name: string;
  /** How the brand is written before a model: "Swarovski NL Pure 10x42". */
  short: string;
  country: Tri;
  /** One line on what the maker makes, for brands with or without a model list. */
  lines: Tri;
  models: { kind: PremiumKind; items: string[] }[];
}

const DE: Tri = { uk: "Німеччина", ru: "Германия", en: "Germany" };
const AT: Tri = { uk: "Австрія", ru: "Австрия", en: "Austria" };
const US: Tri = { uk: "США", ru: "США", en: "USA" };

export const PREMIUM_BRANDS: PremiumBrand[] = [
  {
    name: "Swarovski Optik",
    short: "Swarovski",
    country: AT,
    lines: {
      uk: "біноклі, біноклі-далекоміри, приціли, підзорні труби, тепловізійна оптика",
      ru: "бинокли, бинокли-дальномеры, прицелы, подзорные трубы, тепловизионная оптика",
      en: "binoculars, rangefinding binoculars, riflescopes, spotting scopes, thermal optics",
    },
    models: [
      {
        kind: "binoculars",
        items: [
          "NL Pure 8x42", "NL Pure 10x42", "NL Pure 12x42", "NL Pure 8x32", "NL Pure 10x32",
          "EL 8.5x42", "EL 10x42", "EL 8x32", "EL 10x32",
          "CL Companion 8x30", "CL Companion 10x30", "CL Pocket 8x25", "CL Pocket 10x25",
          "AX Visio 10x32",
        ],
      },
      { kind: "rangefinders", items: ["EL Range 8x42", "EL Range 10x42"] },
      { kind: "sights", items: ["Z8i 1-8x24", "Z8i 2-16x50", "Z8i 2.3-18x56", "Z8i 3.5-28x50"] },
      { kind: "spotting", items: ["ATX 85", "ATX 95", "STX 85", "BTX"] },
      { kind: "thermal", items: ["tM 35"] },
    ],
  },
  {
    name: "ZEISS",
    short: "ZEISS",
    country: DE,
    lines: {
      uk: "біноклі, далекоміри, приціли, тепловізори, підзорні труби",
      ru: "бинокли, дальномеры, прицелы, тепловизоры, подзорные трубы",
      en: "binoculars, rangefinders, riflescopes, thermal imagers, spotting scopes",
    },
    models: [
      {
        kind: "binoculars",
        items: [
          "Victory SF 8x42", "Victory SF 10x42", "Victory SF 8x32", "Victory SF 10x32",
          "SFL 8x40", "SFL 10x40", "SFL 8x30", "SFL 10x30",
          "Conquest HDX 8x42", "Conquest HDX 10x42", "Terra ED 8x42", "Terra ED 10x42",
          "Victory Pocket 8x25",
        ],
      },
      { kind: "rangefinders", items: ["Victory RF 8x42", "Victory RF 10x42", "Victory 8x26 T* PRF"] },
      { kind: "thermal", items: ["DTI 3/25", "DTI 3/35", "DTC 3/25", "DTC 3/38"] },
      {
        kind: "sights",
        items: [
          "Victory V8 1.1-8x30", "Victory V8 2.8-20x56", "Victory V8 4.8-35x60",
          "Conquest V6 1-6x24", "Conquest V6 2.5-15x56", "Conquest V4 3-12x56", "LRP S5 3-18x50",
        ],
      },
      { kind: "spotting", items: ["Harpia 85", "Harpia 95", "Conquest Gavia 85"] },
    ],
  },
  {
    name: "Leica",
    short: "Leica",
    country: DE,
    lines: {
      uk: "біноклі, біноклі-далекоміри, далекоміри, тепловізори, приціли",
      ru: "бинокли, бинокли-дальномеры, дальномеры, тепловизоры, прицелы",
      en: "binoculars, rangefinding binoculars, rangefinders, thermal imagers, riflescopes",
    },
    models: [
      {
        kind: "binoculars",
        items: [
          "Noctivid 8x42", "Noctivid 10x42", "Ultravid HD-Plus 8x42", "Ultravid HD-Plus 10x42",
          "Trinovid HD 8x42", "Trinovid HD 10x42",
        ],
      },
      {
        kind: "rangefinders",
        items: ["Geovid Pro 8x42", "Geovid Pro 10x42", "Geovid Pro 8x32", "Rangemaster CRF 2800.COM", "Rangemaster CRF Max"],
      },
      { kind: "thermal", items: ["Calonox View", "Calonox Sight"] },
      { kind: "sights", items: ["Amplus 6 1-6x24i", "Amplus 6 2.5-15x50"] },
    ],
  },
  {
    name: "Steiner",
    short: "Steiner",
    country: DE,
    lines: {
      uk: "морські та мисливські біноклі, приціли, тепловізійна оптика",
      ru: "морские и охотничьи бинокли, прицелы, тепловизионная оптика",
      en: "marine and hunting binoculars, riflescopes, thermal optics",
    },
    models: [
      {
        kind: "binoculars",
        items: ["Navigator Pro 7x50", "Commander 7x50", "Skyhawk 4.0 8x42", "Ranger Xtreme 8x42", "Ranger Xtreme 10x42"],
      },
      { kind: "sights", items: ["T5Xi 5-25x56"] },
    ],
  },
  {
    name: "Kahles",
    short: "Kahles",
    country: AT,
    lines: {
      uk: "приціли, біноклі, біноклі-далекоміри",
      ru: "прицелы, бинокли, бинокли-дальномеры",
      en: "riflescopes, binoculars, rangefinding binoculars",
    },
    models: [
      { kind: "sights", items: ["K525i 5-25x56", "K318i 3.5-18x50", "Helia 5 2.4-12x56"] },
      { kind: "binoculars", items: ["Helia 8x42", "Helia 10x42"] },
      { kind: "rangefinders", items: ["Helia RF 10x42"] },
    ],
  },
  {
    name: "Schmidt & Bender",
    short: "Schmidt & Bender",
    country: DE,
    lines: { uk: "приціли", ru: "прицелы", en: "riflescopes" },
    models: [
      {
        kind: "sights",
        items: ["PM II 5-25x56", "PM II 3-20x50 Ultra Short", "PM II 1-8x24", "Exos 2.5-13x50", "Polar T96 2.5-10x50"],
      },
    ],
  },
  {
    name: "Meopta",
    short: "Meopta",
    country: { uk: "Чехія", ru: "Чехия", en: "Czech Republic" },
    lines: { uk: "біноклі та приціли", ru: "бинокли и прицелы", en: "binoculars and riflescopes" },
    models: [
      { kind: "binoculars", items: ["MeoStar B1 8x42", "MeoStar B1 10x42", "MeoStar B1.1 8x56"] },
      { kind: "sights", items: ["MeoStar R2 2-12x50 RD", "Optika6 3-18x56"] },
    ],
  },
  {
    name: "GPO German Precision Optics",
    short: "GPO",
    country: DE,
    lines: { uk: "біноклі, далекоміри, приціли", ru: "бинокли, дальномеры, прицелы", en: "binoculars, rangefinders, riflescopes" },
    models: [
      { kind: "binoculars", items: ["Passion HD 8x42", "Passion HD 10x42"] },
      { kind: "rangefinders", items: ["Rangeguide 2800"] },
    ],
  },
  {
    name: "Liemke",
    short: "Liemke",
    country: DE,
    lines: {
      uk: "тепловізійна оптика серій Keiler і Merlin",
      ru: "тепловизионная оптика серий Keiler и Merlin",
      en: "thermal optics, Keiler and Merlin series",
    },
    models: [],
  },
  {
    name: "Minox",
    short: "Minox",
    country: DE,
    lines: { uk: "біноклі та приціли", ru: "бинокли и прицелы", en: "binoculars and riflescopes" },
    models: [],
  },
  {
    name: "Docter",
    short: "Docter",
    country: DE,
    lines: { uk: "біноклі та приціли", ru: "бинокли и прицелы", en: "binoculars and riflescopes" },
    models: [],
  },
  {
    name: "Kite Optics",
    short: "Kite",
    country: { uk: "Бельгія", ru: "Бельгия", en: "Belgium" },
    lines: {
      uk: "біноклі, зокрема зі стабілізацією зображення",
      ru: "бинокли, в том числе со стабилизацией изображения",
      en: "binoculars, including image-stabilised ones",
    },
    models: [{ kind: "binoculars", items: ["Lynx HD+", "Bonelli 2.0", "APC"] }],
  },
  {
    name: "Opticron",
    short: "Opticron",
    country: { uk: "Велика Британія", ru: "Великобритания", en: "United Kingdom" },
    lines: { uk: "біноклі та підзорні труби", ru: "бинокли и подзорные трубы", en: "binoculars and spotting scopes" },
    models: [
      { kind: "binoculars", items: ["Traveller BGA ED", "Discovery WP PC"] },
      { kind: "spotting", items: ["MM4"] },
    ],
  },
  {
    name: "Leupold",
    short: "Leupold",
    country: US,
    lines: { uk: "приціли та біноклі", ru: "прицелы и бинокли", en: "riflescopes and binoculars" },
    models: [
      { kind: "sights", items: ["Mark 5HD", "VX-6HD", "VX-5HD"] },
      { kind: "binoculars", items: ["BX-4"] },
    ],
  },
  {
    name: "Nightforce",
    short: "Nightforce",
    country: US,
    lines: { uk: "приціли", ru: "прицелы", en: "riflescopes" },
    models: [{ kind: "sights", items: ["ATACR 5-25x56", "NX8 2.5-20x50", "NXS 5.5-22x56"] }],
  },
];

/** Every model the page lists, with its brand — for the count and the tests. */
export function allPremiumModels(): string[] {
  return PREMIUM_BRANDS.flatMap((b) => b.models.flatMap((g) => g.items.map((m) => `${b.short} ${m}`)));
}

export interface PremiumOrder {
  /** What the buyer wants — typed or picked from the brand list. */
  model: string;
  name: string;
  phone: string;
  locale: Locale;
  createdAt: string;
}

export interface PremiumValidation {
  ok: boolean;
  errors: Record<string, string>;
  value?: PremiumOrder;
}

const MESSAGES: Record<Locale, Record<string, string>> = {
  uk: {
    model: "Вкажіть модель, яку шукаєте",
    name: "Вкажіть ім'я",
    phone: "Вкажіть телефон у форматі 0XX XXX XX XX",
  },
  ru: {
    model: "Укажите модель, которую ищете",
    name: "Укажите имя",
    phone: "Укажите телефон в формате 0XX XXX XX XX",
  },
  en: {
    model: "Name the model you are looking for",
    name: "Enter your name",
    phone: "Enter a Ukrainian phone number, 0XX XXX XX XX",
  },
};

/** A model, a name and a working phone — without any of them it is not a lead. */
export function validatePremiumOrder(input: Record<string, unknown>): PremiumValidation {
  const locale: Locale =
    input.locale === "ru" || input.locale === "en" ? (input.locale as Locale) : "uk";
  const msg = MESSAGES[locale];
  const errors: Record<string, string> = {};

  const model = String(input.model || "").trim().slice(0, 200);
  if (model.length < 2) errors.model = msg.model;

  const name = String(input.name || "").trim().slice(0, 100);
  if (name.length < 2) errors.name = msg.name;

  const phone = normalizePhone(String(input.phone || ""));
  if (!phone) errors.phone = msg.phone;

  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    errors: {},
    value: { model, name, phone: phone as string, locale, createdAt: new Date().toISOString() },
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
  const telHref = o.phone.replace(/[^\d+]/g, "");
  const lines = [
    "💎 <b>Під замовлення: преміальна оптика</b>",
    "",
    `🔭 <b>Шукає:</b> ${escapeHtml(o.model)}`,
    "",
    `👤 <b>${escapeHtml(o.name)}</b>`,
    `📞 <a href="tel:${escapeHtml(telHref)}">${escapeHtml(o.phone)}</a>`,
  ];
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
