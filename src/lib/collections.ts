/**
 * Spec landing pages: /catalog/<category>/<collection> — "Тепловізори з
 * матрицею 640", "Приціли з далекоміром", "Тепловізори до 30 000 грн".
 * People search by these specs; the category page alone doesn't rank for
 * them. Each collection is a fixed catalog filter plus its own copy; numbers
 * on the page come from the live rows via the same rules as the filter.
 */

import {
  formatUah,
  pluralProducts,
  summarizeRows,
  type BrandProductRow,
  type BrandSummary,
  type Locale,
} from "@/lib/brand-pages";

export type CollectionFilter = {
  /** Sensor width, matched as a prefix like the catalog filter ("640x480" ✓) */
  resolution?: "256" | "384" | "640";
  priceMax?: number;
  /** Case-insensitive substring of the name/slug, like the catalog `q` */
  q?: string;
};

export type Collection = {
  category: string;
  slug: string;
  filter: CollectionFilter;
  /** H1 — also the title stem */
  h1: Record<Locale, string>;
  /** Short chip label on the category page */
  chip: Record<Locale, string>;
  intro: Record<Locale, string>;
};

const LRF_NOTE = {
  uk: "У підбірці — моделі з позначкою LRF у назві.",
  ru: "В подборке — модели с пометкой LRF в названии.",
};

export const COLLECTIONS: Collection[] = [
  // ── Тепловізори ──────────────────────────────────────────────
  {
    category: "teplovizori",
    slug: "matrytsia-640",
    filter: { resolution: "640" },
    h1: { uk: "Тепловізори з матрицею 640", ru: "Тепловизоры с матрицей 640" },
    chip: { uk: "Матриця 640", ru: "Матрица 640" },
    intro: {
      uk: "Матриця 640 (640×512 або 640×480 пікселів) — найвища роздільна здатність серед поширених тепловізорів. З тим самим об'єктивом вона дає ширше поле зору, ніж 384, а при цифровому збільшенні зберігає більше деталей. Такі прилади обирають для відкритих полів, великих дистанцій і професійних задач.",
      ru: "Матрица 640 (640×512 или 640×480 пикселей) — самое высокое разрешение среди распространённых тепловизоров. С тем же объективом она даёт более широкое поле зрения, чем 384, а при цифровом увеличении сохраняет больше деталей. Такие приборы выбирают для открытых полей, больших дистанций и профессиональных задач.",
    },
  },
  {
    category: "teplovizori",
    slug: "matrytsia-384",
    filter: { resolution: "384" },
    h1: { uk: "Тепловізори з матрицею 384", ru: "Тепловизоры с матрицей 384" },
    chip: { uk: "Матриця 384", ru: "Матрица 384" },
    intro: {
      uk: "Матриця 384×288 — золота середина між ціною та деталізацією: помітно чіткіша картинка, ніж на 256, і нижча ціна, ніж у 640. Найпопулярніший вибір для полювання в лісі та на полях середнього розміру.",
      ru: "Матрица 384×288 — золотая середина между ценой и детализацией: заметно более чёткая картинка, чем на 256, и цена ниже, чем у 640. Самый популярный выбор для охоты в лесу и на полях среднего размера.",
    },
  },
  {
    category: "teplovizori",
    slug: "matrytsia-256",
    filter: { resolution: "256" },
    h1: { uk: "Тепловізори з матрицею 256", ru: "Тепловизоры с матрицей 256" },
    chip: { uk: "Матриця 256", ru: "Матрица 256" },
    intro: {
      uk: "Матриця 256×192 — вхідний рівень: компактні й доступні прилади для коротких дистанцій — прогулянок, пошуку підранка, огляду території біля дому.",
      ru: "Матрица 256×192 — начальный уровень: компактные и доступные приборы для коротких дистанций — прогулок, поиска подранка, осмотра территории у дома.",
    },
  },
  {
    category: "teplovizori",
    slug: "z-dalekomirom",
    filter: { q: "lrf" },
    h1: { uk: "Тепловізори з далекоміром", ru: "Тепловизоры с дальномером" },
    chip: { uk: "З далекоміром", ru: "С дальномером" },
    intro: {
      uk: `Вбудований лазерний далекомір (LRF) одним натисканням показує точну відстань до цілі — не треба оцінювати дистанцію на око. ${LRF_NOTE.uk}`,
      ru: `Встроенный лазерный дальномер (LRF) одним нажатием показывает точное расстояние до цели — не нужно оценивать дистанцию на глаз. ${LRF_NOTE.ru}`,
    },
  },
  {
    category: "teplovizori",
    slug: "do-30000",
    filter: { priceMax: 30000 },
    h1: { uk: "Тепловізори до 30 000 грн", ru: "Тепловизоры до 30 000 грн" },
    chip: { uk: "До 30 000 грн", ru: "До 30 000 грн" },
    intro: {
      uk: "Найдоступніші тепловізори в каталозі — для першого знайомства з тепловізійною оптикою, коротких дистанцій і побутових задач.",
      ru: "Самые доступные тепловизоры в каталоге — для первого знакомства с тепловизионной оптикой, коротких дистанций и бытовых задач.",
    },
  },
  {
    category: "teplovizori",
    slug: "do-50000",
    filter: { priceMax: 50000 },
    h1: { uk: "Тепловізори до 50 000 грн", ru: "Тепловизоры до 50 000 грн" },
    chip: { uk: "До 50 000 грн", ru: "До 50 000 грн" },
    intro: {
      uk: "Бюджетний і середній сегмент: прилади для полювання, спостереження та охорони за розумну ціну.",
      ru: "Бюджетный и средний сегмент: приборы для охоты, наблюдения и охраны по разумной цене.",
    },
  },

  // ── Тепловізійні приціли ────────────────────────────────────
  {
    category: "pricili",
    slug: "matrytsia-640",
    filter: { resolution: "640" },
    h1: { uk: "Тепловізійні приціли з матрицею 640", ru: "Тепловизионные прицелы с матрицей 640" },
    chip: { uk: "Матриця 640", ru: "Матрица 640" },
    intro: {
      uk: "Приціли з матрицею 640 — для дальніх пострілів і відкритих полів: більше пікселів на цілі та ширше поле зору з тим самим об'єктивом.",
      ru: "Прицелы с матрицей 640 — для дальних выстрелов и открытых полей: больше пикселей на цели и более широкое поле зрения с тем же объективом.",
    },
  },
  {
    category: "pricili",
    slug: "matrytsia-384",
    filter: { resolution: "384" },
    h1: { uk: "Тепловізійні приціли з матрицею 384", ru: "Тепловизионные прицелы с матрицей 384" },
    chip: { uk: "Матриця 384", ru: "Матрица 384" },
    intro: {
      uk: "Приціли з матрицею 384 — найпопулярніший вибір мисливців: достатня деталізація для полювання в лісі та на полях за помірну ціну.",
      ru: "Прицелы с матрицей 384 — самый популярный выбор охотников: достаточная детализация для охоты в лесу и на полях по умеренной цене.",
    },
  },
  {
    category: "pricili",
    slug: "matrytsia-256",
    filter: { resolution: "256" },
    h1: { uk: "Тепловізійні приціли з матрицею 256", ru: "Тепловизионные прицелы с матрицей 256" },
    chip: { uk: "Матриця 256", ru: "Матрица 256" },
    intro: {
      uk: "Приціли з матрицею 256 — доступний вхід у тепловізійну стрільбу на короткі та середні дистанції.",
      ru: "Прицелы с матрицей 256 — доступный вход в тепловизионную стрельбу на короткие и средние дистанции.",
    },
  },
  {
    category: "pricili",
    slug: "z-dalekomirom",
    filter: { q: "lrf" },
    h1: { uk: "Тепловізійні приціли з далекоміром", ru: "Тепловизионные прицелы с дальномером" },
    chip: { uk: "З далекоміром", ru: "С дальномером" },
    intro: {
      uk: `Приціли з вбудованим лазерним далекоміром (LRF) вимірюють відстань до цілі, а в багатьох моделях балістичний калькулятор одразу враховує її в точці прицілювання. ${LRF_NOTE.uk}`,
      ru: `Прицелы со встроенным лазерным дальномером (LRF) измеряют расстояние до цели, а во многих моделях баллистический калькулятор сразу учитывает его в точке прицеливания. ${LRF_NOTE.ru}`,
    },
  },
  {
    category: "pricili",
    slug: "do-50000",
    filter: { priceMax: 50000 },
    h1: { uk: "Тепловізійні приціли до 50 000 грн", ru: "Тепловизионные прицелы до 50 000 грн" },
    chip: { uk: "До 50 000 грн", ru: "До 50 000 грн" },
    intro: {
      uk: "Найдоступніші тепловізійні приціли в каталозі — для знайомства з нічним полюванням.",
      ru: "Самые доступные тепловизионные прицелы в каталоге — для знакомства с ночной охотой.",
    },
  },
  {
    category: "pricili",
    slug: "do-100000",
    filter: { priceMax: 100000 },
    h1: { uk: "Тепловізійні приціли до 100 000 грн", ru: "Тепловизионные прицелы до 100 000 грн" },
    chip: { uk: "До 100 000 грн", ru: "До 100 000 грн" },
    intro: {
      uk: "Тепловізійні приціли до 100 000 грн — широкий вибір моделей для полювання від провідних брендів.",
      ru: "Тепловизионные прицелы до 100 000 грн — широкий выбор моделей для охоты от ведущих брендов.",
    },
  },

  // ── Насадки ──────────────────────────────────────────────────
  {
    category: "nasadky",
    slug: "matrytsia-640",
    filter: { resolution: "640" },
    h1: { uk: "Тепловізійні насадки з матрицею 640", ru: "Тепловизионные насадки с матрицей 640" },
    chip: { uk: "Матриця 640", ru: "Матрица 640" },
    intro: {
      uk: "Насадки з матрицею 640 перетворюють ваш денний приціл на нічний і дають максимальну деталізацію для дальніх дистанцій.",
      ru: "Насадки с матрицей 640 превращают ваш дневной прицел в ночной и дают максимальную детализацию для дальних дистанций.",
    },
  },
  {
    category: "nasadky",
    slug: "matrytsia-384",
    filter: { resolution: "384" },
    h1: { uk: "Тепловізійні насадки з матрицею 384", ru: "Тепловизионные насадки с матрицей 384" },
    chip: { uk: "Матриця 384", ru: "Матрица 384" },
    intro: {
      uk: "Насадки з матрицею 384 — оптимальний баланс ціни та деталізації для полювання з денним прицілом.",
      ru: "Насадки с матрицей 384 — оптимальный баланс цены и детализации для охоты с дневным прицелом.",
    },
  },

  // ── Біноклі ──────────────────────────────────────────────────
  {
    category: "binokli",
    slug: "matrytsia-640",
    filter: { resolution: "640" },
    h1: { uk: "Тепловізійні біноклі з матрицею 640", ru: "Тепловизионные бинокли с матрицей 640" },
    chip: { uk: "Матриця 640", ru: "Матрица 640" },
    intro: {
      uk: "Тепловізійні біноклі з матрицею 640: спостереження двома очима без втоми та висока деталізація для огляду великих територій.",
      ru: "Тепловизионные бинокли с матрицей 640: наблюдение двумя глазами без усталости и высокая детализация для осмотра больших территорий.",
    },
  },
  {
    category: "binokli",
    slug: "z-dalekomirom",
    filter: { q: "lrf" },
    h1: { uk: "Тепловізійні біноклі з далекоміром", ru: "Тепловизионные бинокли с дальномером" },
    chip: { uk: "З далекоміром", ru: "С дальномером" },
    intro: {
      uk: `Біноклі з вбудованим далекоміром одразу показують відстань до цілі — зручно для розвідки угідь і охорони великих територій. ${LRF_NOTE.uk}`,
      ru: `Бинокли со встроенным дальномером сразу показывают расстояние до цели — удобно для разведки угодий и охраны больших территорий. ${LRF_NOTE.ru}`,
    },
  },
];

export function getCollection(category: string, slug: string): Collection | null {
  return COLLECTIONS.find((c) => c.category === category && c.slug === slug) || null;
}

export function collectionsFor(category: string): Collection[] {
  return COLLECTIONS.filter((c) => c.category === category);
}

/** Same rules as the catalog query (resolution prefix, price, name/slug q). */
export function matchesCollection(row: BrandProductRow, c: Collection): boolean {
  if (row.categorySlug !== c.category) return false;
  const f = c.filter;
  if (f.resolution && !(row.resolution || "").startsWith(f.resolution)) return false;
  if (f.priceMax != null && !(row.price <= f.priceMax)) return false;
  if (f.q) {
    const hay = `${row.nameUk} ${row.nameRu} ${row.slug}`.toLowerCase();
    if (!hay.includes(f.q.toLowerCase())) return false;
  }
  return true;
}

export type CollectionSummary = BrandSummary & {
  /** Brands in the collection, largest first */
  brands: { slug: string; name: string; count: number }[];
};

export function summarizeCollection(
  rows: BrandProductRow[],
  c: Collection,
  locale: Locale,
  brandName: (slug: string, name: string) => string = (_s, n) => n
): CollectionSummary {
  const list = rows.filter((r) => matchesCollection(r, c));
  const byBrand = new Map<string, { name: string; count: number }>();
  for (const r of list) {
    const e = byBrand.get(r.brandSlug) || { name: brandName(r.brandSlug, r.brandName), count: 0 };
    e.count += 1;
    byBrand.set(r.brandSlug, e);
  }
  return {
    ...summarizeRows(list, locale),
    brands: Array.from(byBrand, ([slug, e]) => ({ slug, ...e })).sort(
      (a, b) => b.count - a.count
    ),
  };
}

export function collectionTitle(c: Collection, locale: Locale, page = 1): string {
  if (page > 1) return `${c.h1[locale]} — ${locale === "ru" ? "страница" : "сторінка"} ${page}`;
  return `${c.h1[locale]} — ${locale === "ru" ? "купить в Украине, цены" : "купити в Україні, ціни"}`;
}

/** ≤160 chars; optional parts dropped whole. */
export function collectionDescription(
  c: Collection,
  s: CollectionSummary,
  locale: Locale
): string {
  const ru = locale === "ru";
  const parts = [
    `${c.h1[locale]} ${ru ? "в" : "у"} Pro-Optics: ${pluralProducts(s.total, locale)}.`,
    s.minPrice ? `${ru ? "Цены от" : "Ціни від"} ${formatUah(s.minPrice.price)}.` : "",
    s.brands.length
      ? `${ru ? "Бренды" : "Бренди"}: ${s.brands.slice(0, 4).map((b) => b.name).join(", ")}.`
      : "",
    ru ? "Доставка Новой Почтой по Украине." : "Доставка Новою Поштою по Україні.",
  ].filter(Boolean);
  let out = "";
  for (const p of parts) {
    const next = out ? `${out} ${p}` : p;
    if (next.length > 160) continue;
    out = next;
  }
  return out;
}

type Query = Record<string, string | string[] | undefined>;

/**
 * A catalog URL filtered by exactly one spec that a collection covers
 * (`?res=640`, `?max=30000`, optionally `&page=N`) lists the same products
 * as that collection — return it so the facet can point its canonical there.
 */
export function collectionForFacet(category: string, query: Query): Collection | null {
  const keys = Object.keys(query).filter((k) => {
    const v = query[k];
    return k !== "page" && (Array.isArray(v) ? v.some((x) => x !== "") : v != null && v !== "");
  });
  if (keys.length !== 1) return null;
  const [key] = keys;
  const raw = query[key];
  if (Array.isArray(raw) && raw.length !== 1) return null;
  const value = String(Array.isArray(raw) ? raw[0] : raw);
  return (
    collectionsFor(category).find((c) =>
      key === "res"
        ? c.filter.resolution === value && c.filter.priceMax == null && !c.filter.q
        : key === "max"
          ? c.filter.priceMax != null &&
            String(c.filter.priceMax) === value &&
            !c.filter.resolution &&
            !c.filter.q
          : false
    ) || null
  );
}
