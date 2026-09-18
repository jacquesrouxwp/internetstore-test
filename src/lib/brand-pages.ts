/**
 * Brand landing pages (/brand/[slug], /brand/[slug]/[category]).
 * Pure helpers — summaries, titles and copy are derived from the live product
 * rows so every number on the page matches the catalog. No React, no I/O.
 */

export type Locale = "uk" | "ru";

/** Lightweight product row — enough to summarise a brand. */
export type BrandProductRow = {
  slug: string;
  nameUk: string;
  nameRu: string;
  price: number;
  stock: number;
  brandSlug: string;
  brandName: string;
  categorySlug: string | null;
  updatedAt?: string | null;
};

/** Below this a brand (or brand × category) page is kept out of the index. */
export const MIN_INDEXABLE_PRODUCTS = 3;

const ACCESSORY_CATEGORY = "aksesuary";

type CatWords = { full: string; short: string };

/** Plural forms used in titles/H1 ("Тепловізійні приціли Pulsar"). */
export const CATEGORY_WORDS: Record<string, Record<Locale, CatWords>> = {
  teplovizori: {
    uk: { full: "тепловізори", short: "тепловізори" },
    ru: { full: "тепловизоры", short: "тепловизоры" },
  },
  pricili: {
    uk: { full: "тепловізійні приціли", short: "приціли" },
    ru: { full: "тепловизионные прицелы", short: "прицелы" },
  },
  nasadky: {
    uk: { full: "тепловізійні насадки", short: "насадки" },
    ru: { full: "тепловизионные насадки", short: "насадки" },
  },
  binokli: {
    uk: { full: "тепловізійні біноклі", short: "біноклі" },
    ru: { full: "тепловизионные бинокли", short: "бинокли" },
  },
  pnb: {
    uk: { full: "прилади нічного бачення", short: "ПНБ" },
    ru: { full: "приборы ночного видения", short: "ПНВ" },
  },
  "pricili-pnb": {
    uk: { full: "приціли нічного бачення", short: "нічні приціли" },
    ru: { full: "прицелы ночного видения", short: "ночные прицелы" },
  },
  aksesuary: {
    uk: { full: "аксесуари", short: "аксесуари" },
    ru: { full: "аксессуары", short: "аксессуары" },
  },
  kolimatronie: {
    uk: { full: "коліматорні приціли", short: "коліматори" },
    ru: { full: "коллиматорные прицелы", short: "коллиматоры" },
  },
};

export function categoryWords(
  slug: string,
  locale: Locale,
  fallbackName?: string
): CatWords {
  const w = CATEGORY_WORDS[slug]?.[locale];
  if (w) return w;
  const name = (fallbackName || slug).toLowerCase();
  return { full: name, short: name };
}

/** How brands are written in copy — the DB has some in caps ("PULSAR"). */
const BRAND_DISPLAY_NAMES: Record<string, string> = {
  pulsar: "Pulsar",
  infiray: "InfiRay",
  armasight: "Armasight",
  dahua: "Dahua",
  konus: "Konus",
};

export function brandDisplayName(slug: string, name: string): string {
  return BRAND_DISPLAY_NAMES[slug] || name;
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/**
 * Model lines per brand, matched as whole words in product names/slugs.
 * Only lines that actually occur in the catalog are ever shown.
 */
export const BRAND_LINES: Record<string, string[]> = {
  pulsar: [
    "Thermion", "Axion", "Helion", "Telos", "Trail", "Apex", "Quantum",
    "Krypton", "Core", "Accolade", "Merger", "Proton", "Talion",
    "Digisight", "DigiForce", "Challenger", "Recon",
  ],
  hikmicro: [
    "Lynx", "Falcon", "Condor", "Gryphon", "Owl", "Habrok", "Raptor",
    "Thunder", "Stellar", "Panther", "Alpex", "Cheetah",
  ],
  agm: [
    "Rattler", "Adder", "Taipan", "Varmint", "Secutor", "Fuzion",
    "Observir", "Sidewinder", "Voyage", "ReachIR", "Seeker", "Clarion",
    "Wolf", "PVS",
  ],
  infiray: [
    "Eye", "Finder", "Rico", "Tube", "Saim", "Clip", "Geni", "Mate",
    "Bolt", "Xeye", "Nocpix",
  ],
  atn: ["ThOR", "Mars", "OTS", "Odin", "BinoX", "X-Sight", "BlazeTrek"],
  pard: [
    "Leopard", "Pantera", "Ocelot", "Stalker", "Predator", "Harrier",
    "Osprey", "Owl", "Landsat",
  ],
  guide: ["TrackIR"],
  thermtec: ["Cyclops", "Vidar", "Ares", "Wild", "ThermEye", "Oryx", "Cyclone", "Ibex"],
  armasight: ["Prometheus", "Vulcan", "Zeus", "Apollo", "Predator", "Nemesis"],
  flir: ["Scout"],
  nvectech: ["Patriot", "Defender"],
};

function lineRegex(line: string): RegExp {
  // "X-Sight" should also match "x sight" / "xsight" in names and slugs
  const body = line
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/-/g, "[-\\s]?");
  return new RegExp(`(^|[^a-z0-9])${body}([^a-z0-9]|$)`, "i");
}

export function detectLine(
  brandSlug: string,
  row: Pick<BrandProductRow, "nameUk" | "slug">
): string | null {
  const lines = BRAND_LINES[brandSlug];
  if (!lines) return null;
  const hay = `${row.nameUk} ${row.slug.replace(/-/g, " ")}`;
  for (const line of lines) {
    if (lineRegex(line).test(hay)) return line;
  }
  return null;
}

export type PricePoint = { price: number; name: string; slug: string };

export type BrandSummary = {
  total: number;
  inStock: number;
  minPrice: PricePoint | null;
  maxPrice: PricePoint | null;
  /** Category slug → count, largest first */
  byCategory: { slug: string; count: number }[];
  /** Model lines present, largest first, with their main category */
  lines: { name: string; count: number; categorySlug: string | null }[];
  lastModified: string | null;
};

export function summarizeBrand(
  rows: BrandProductRow[],
  brandSlug: string,
  locale: Locale,
  categorySlug?: string
): BrandSummary {
  const list = rows.filter(
    (r) =>
      r.brandSlug === brandSlug &&
      (!categorySlug || r.categorySlug === categorySlug)
  );

  // Mounts and batteries would make "prices from" start at a bracket, so
  // accessories only count when the listing has nothing else.
  const priced = list.some((r) => r.categorySlug !== ACCESSORY_CATEGORY)
    ? list.filter((r) => r.categorySlug !== ACCESSORY_CATEGORY)
    : list;
  let minPrice: PricePoint | null = null;
  let maxPrice: PricePoint | null = null;
  for (const r of priced) {
    if (r.price <= 0) continue;
    const name = locale === "ru" ? r.nameRu || r.nameUk : r.nameUk;
    if (!minPrice || r.price < minPrice.price)
      minPrice = { price: r.price, name, slug: r.slug };
    if (!maxPrice || r.price > maxPrice.price)
      maxPrice = { price: r.price, name, slug: r.slug };
  }
  const cats = new Map<string, number>();
  const lines = new Map<string, { count: number; cats: Map<string, number> }>();
  let inStock = 0;
  let lastModified: string | null = null;

  for (const r of list) {
    if (r.stock > 0) inStock += 1;
    if (r.categorySlug) cats.set(r.categorySlug, (cats.get(r.categorySlug) || 0) + 1);
    const line = detectLine(brandSlug, r);
    if (line) {
      const entry = lines.get(line) || { count: 0, cats: new Map() };
      entry.count += 1;
      if (r.categorySlug)
        entry.cats.set(r.categorySlug, (entry.cats.get(r.categorySlug) || 0) + 1);
      lines.set(line, entry);
    }
    if (r.updatedAt && (!lastModified || r.updatedAt > lastModified))
      lastModified = r.updatedAt;
  }

  const byCount = <T extends { count: number }>(a: T, b: T) => b.count - a.count;

  return {
    total: list.length,
    inStock,
    minPrice,
    maxPrice,
    byCategory: Array.from(cats, ([slug, count]) => ({ slug, count })).sort(byCount),
    lines: Array.from(lines, ([name, v]) => ({
      name,
      count: v.count,
      categorySlug:
        Array.from(v.cats).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    })).sort(byCount),
    lastModified,
  };
}

/** Brands with at least one product, with their product count. */
export function brandCounts(rows: BrandProductRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.brandSlug, (m.get(r.brandSlug) || 0) + 1);
  return m;
}

/** Brand × category combos worth their own indexable page. */
export function indexableBrandCategories(
  rows: BrandProductRow[]
): { brandSlug: string; categorySlug: string; count: number; lastModified: string | null }[] {
  const m = new Map<string, { count: number; lastModified: string | null }>();
  for (const r of rows) {
    if (!r.categorySlug) continue;
    const key = `${r.brandSlug}|${r.categorySlug}`;
    const e = m.get(key) || { count: 0, lastModified: null };
    e.count += 1;
    if (r.updatedAt && (!e.lastModified || r.updatedAt > e.lastModified))
      e.lastModified = r.updatedAt;
    m.set(key, e);
  }
  return Array.from(m)
    .filter(([, e]) => e.count >= MIN_INDEXABLE_PRODUCTS)
    .map(([key, e]) => {
      const [brandSlug, categorySlug] = key.split("|");
      return { brandSlug, categorySlug, ...e };
    });
}

/** "Тепловізори та приціли" from the two biggest categories. */
export function brandProductPhrase(
  summary: BrandSummary,
  locale: Locale,
  names?: Record<string, string>
): string {
  const top = summary.byCategory
    .filter((c) => c.slug !== "aksesuary" || summary.byCategory.length === 1)
    .slice(0, 2)
    .map((c) => categoryWords(c.slug, locale, names?.[c.slug]).short);
  if (!top.length) return locale === "ru" ? "Оптика" : "Оптика";
  const joined = top.join(locale === "ru" ? " и " : " та ");
  return capitalize(joined);
}

/** "115 000 грн" with no-break spaces so a price never wraps mid-number. */
export function formatUah(n: number): string {
  const digits = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return `${digits}\u00a0грн`;
}

/** 1 товар / 2 товари / 5 товарів (uk), 1 товар / 2 товара / 5 товаров (ru). */
export function pluralProducts(n: number, locale: Locale): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  const few = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14);
  const one = mod10 === 1 && mod100 !== 11;
  if (locale === "ru") return `${n} ${one ? "товар" : few ? "товара" : "товаров"}`;
  return `${n} ${one ? "товар" : few ? "товари" : "товарів"}`;
}

export function brandPageTitle(
  brandName: string,
  summary: BrandSummary,
  locale: Locale,
  opts: { categorySlug?: string; categoryName?: string; page?: number } = {}
): { h1: string; title: string } {
  const h1 = opts.categorySlug
    ? `${capitalize(categoryWords(opts.categorySlug, locale, opts.categoryName).full)} ${brandName}`
    : `${brandProductPhrase(summary, locale)} ${brandName}`;
  if (opts.page && opts.page > 1) {
    return { h1, title: `${h1} — ${locale === "ru" ? "страница" : "сторінка"} ${opts.page}` };
  }
  const tail = locale === "ru" ? "купить в Украине, цены" : "купити в Україні, ціни";
  return { h1, title: `${h1} — ${tail}` };
}

/** Meta description ≤160 chars; optional parts are dropped whole. */
export function brandMetaDescription(
  brandName: string,
  summary: BrandSummary,
  locale: Locale,
  categoryLabel?: string
): string {
  const ru = locale === "ru";
  const what = categoryLabel || brandProductPhrase(summary, locale).toLowerCase();
  const parts = [
    ru
      ? `${capitalize(what)} ${brandName} в Pro-Optics: ${pluralProducts(summary.total, locale)}.`
      : `${capitalize(what)} ${brandName} у Pro-Optics: ${pluralProducts(summary.total, locale)}.`,
    summary.minPrice
      ? ru
        ? `Цены от ${formatUah(summary.minPrice.price)}.`
        : `Ціни від ${formatUah(summary.minPrice.price)}.`
      : "",
    summary.inStock > 0
      ? ru
        ? `${summary.inStock} в наличии.`
        : `${summary.inStock} в наявності.`
      : "",
    ru
      ? "Доставка Новой Почтой по Украине, гарантия."
      : "Доставка Новою Поштою по Україні, гарантія.",
  ].filter(Boolean);
  let out = "";
  for (const p of parts) {
    const next = out ? `${out} ${p}` : p;
    if (next.length > 160) continue;
    out = next;
  }
  return out;
}

export type Faq = { q: string; a: string };

/** Q&A built only from catalog numbers — nothing we can't back up. */
export function brandFaq(
  brandName: string,
  summary: BrandSummary,
  locale: Locale,
  categoryLabel?: string
): Faq[] {
  const ru = locale === "ru";
  const out: Faq[] = [];
  // Brand-wide prices span several categories, so ask about "прилади"
  const what = categoryLabel || (ru ? "приборы" : "прилади");

  if (summary.minPrice && summary.maxPrice) {
    const range =
      summary.minPrice.price === summary.maxPrice.price
        ? formatUah(summary.minPrice.price)
        : ru
          ? `от ${formatUah(summary.minPrice.price)} до ${formatUah(summary.maxPrice.price)}`
          : `від ${formatUah(summary.minPrice.price)} до ${formatUah(summary.maxPrice.price)}`;
    out.push({
      q: ru
        ? `Сколько стоят ${what} ${brandName}?`
        : `Скільки коштують ${what} ${brandName}?`,
      a: ru
        ? `В каталоге Pro-Optics цены — ${range}. Самая доступная модель сейчас — ${summary.minPrice.name}.`
        : `У каталозі Pro-Optics ціни — ${range}. Найдоступніша модель зараз — ${summary.minPrice.name}.`,
    });
  }

  out.push({
    q: ru
      ? `Какие модели ${brandName} есть в наличии?`
      : `Які моделі ${brandName} є в наявності?`,
    a: ru
      ? `Сейчас в наличии ${summary.inStock} из ${pluralProducts(summary.total, locale)}. Наличие указано в карточке каждой модели. Если нужной нет — консультант подскажет аналог.`
      : `Зараз в наявності ${summary.inStock} з ${pluralProducts(summary.total, locale)}. Наявність вказана в картці кожної моделі. Якщо потрібної немає — консультант підкаже аналог.`,
  });

  out.push({
    q: ru
      ? `Есть ли гарантия и доставка на ${brandName}?`
      : `Чи є гарантія та доставка на ${brandName}?`,
    a: ru
      ? "Да. Доставляем Новой Почтой по всей Украине, оплата возможна при получении. На приборы действует гарантия, возврат — в течение 14 дней."
      : "Так. Доставляємо Новою Поштою по всій Україні, оплата можлива при отриманні. На прилади діє гарантія, повернення — протягом 14 днів.",
  });

  return out;
}
