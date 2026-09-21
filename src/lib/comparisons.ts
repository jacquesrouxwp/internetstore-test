/**
 * "X vs Y" comparison pages (/porivniannia/<pair>). Pairs are curated to be
 * the same class (matrix, lens, type) — checked against the live cards.
 * Every statement on the page is arithmetic on the two cards' passport data;
 * nothing is scored or recommended beyond what the numbers say.
 */

import type { Product } from "@/types";
import { formatUah, type Locale } from "@/lib/brand-pages";
import { parseFocalMm, parsePitchUm } from "@/lib/thermal/parse-product-thermal";
import { specNetdMk } from "@/lib/thermal/simulator-link";

export type Comparison = {
  slug: string;
  a: { slug: string; name: string };
  b: { slug: string; name: string };
};

export const COMPARISONS: Comparison[] = [
  {
    slug: "pulsar-axion-2-xg35-vs-hikmicro-lynx-lq35",
    a: { slug: "pulsar-teplovizor-pulsar-axion-2-xg35-07601", name: "Pulsar Axion 2 XG35" },
    b: { slug: "hikmicro-teplovizor-hikmicro-lynx-lq35-3-0-lq35-3-0", name: "HikMicro Lynx LQ35 3.0" },
  },
  {
    slug: "pulsar-axion-compact-xq19-vs-hikmicro-lynx-lh19",
    a: { slug: "pulsar-teplovizor-pulsar-axion-compact-xq19-77517", name: "Pulsar Axion Compact XQ19" },
    b: { slug: "hikmicro-teplovizor-hikmicro-lynx-lh19-3-0-lh19-3-0", name: "HikMicro Lynx LH19 3.0" },
  },
  {
    slug: "hikmicro-condor-cq35l-vs-pulsar-axion-2-xg35-lrf",
    a: { slug: "hikmicro-teplovizor-hikmicro-condor-lrf-cq35l-2-0-cq35l-2-0", name: "HikMicro Condor LRF CQ35L 2.0" },
    b: { slug: "pulsar-teplovizor-pulsar-axion-2-xg35-lrf-77471", name: "Pulsar Axion 2 XG35 LRF" },
  },
  {
    slug: "agm-adder-v2-35-384-vs-agm-rattler-v2-35-384",
    a: { slug: "agm-teploviziynyy-prytsil-agm-adder-v2-35-384-agm-adder-v2-35-384", name: "AGM Adder V2 35-384" },
    b: { slug: "agm-teploviziynyy-prytsil-agm-rattler-v2-35-384-314204550205r331", name: "AGM Rattler V2 35-384" },
  },
  {
    slug: "agm-adder-v2-35-384-vs-hikmicro-thunder-th35",
    a: { slug: "agm-teploviziynyy-prytsil-agm-adder-v2-35-384-agm-adder-v2-35-384", name: "AGM Adder V2 35-384" },
    b: { slug: "hikmicro-teploviziynyy-prytsil-hikmicro-thunder-th35-hm-tr13-35xf-w-th35", name: "HikMicro Thunder TH35" },
  },
];

export function getComparison(slug: string): Comparison | null {
  return COMPARISONS.find((c) => c.slug === slug) || null;
}

export function comparisonsFor(productSlug: string): Comparison[] {
  return COMPARISONS.filter((c) => c.a.slug === productSlug || c.b.slug === productSlug);
}

type ProductLike = Pick<Product, "price" | "specs" | "detectionRangeM" | "resolution" | "nameUk">;

export type Metrics = {
  price: number | null;
  detectM: number | null;
  netdMk: number | null;
  weightG: number | null;
  batteryH: number | null;
  lrf: boolean | null;
  resolution: string | null;
  lensMm: number | null;
  pitchUm: number | null;
};

function specNumber(specs: Record<string, string> | undefined, key: RegExp): number | null {
  for (const [k, v] of Object.entries(specs || {})) {
    if (!key.test(k)) continue;
    const m = String(v).replace(",", ".").match(/\d+(?:\.\d+)?/);
    if (m) return Number(m[0]);
  }
  return null;
}

function specYesNo(specs: Record<string, string> | undefined, key: RegExp): boolean | null {
  for (const [k, v] of Object.entries(specs || {})) {
    if (!key.test(k)) continue;
    if (/^(так|да|yes|є|есть)/i.test(String(v).trim())) return true;
    if (/^(ні|нет|no)/i.test(String(v).trim())) return false;
  }
  return null;
}

function roundOrNull(x: number | null): number | null {
  return x == null ? null : Math.round(x);
}

/** 6.5 → "6,5" (uk/ru decimal comma) */
const dec = (x: number) => String(x).replace(".", ",");

export function productMetrics(p: ProductLike): Metrics {
  const specs = p.specs || {};
  const lrfSpec = specYesNo(specs, /лазерн\S* далекомір|лазерн\S* дальномер/i);
  return {
    price: p.price > 0 ? p.price : null,
    detectM:
      p.detectionRangeM ||
      specNumber(specs, /дальн?і?ість виявлення людини|дальность обнаружения человека/i),
    netdMk: specNetdMk(specs),
    // Rounded here so a stated "354.5 г" and the difference agree on screen
    weightG: roundOrNull(specNumber(specs, /^(вага|вес)/i)),
    batteryH: specNumber(specs, /автономн/i),
    lrf: lrfSpec ?? (/\blrf\b/i.test(p.nameUk) ? true : null),
    resolution: p.resolution || null,
    lensMm: parseFocalMm(specs, p.nameUk),
    pitchUm: parsePitchUm(specs),
  };
}

/** 1750 → "1 750" with a no-break space, like formatUah(). */
const n = (x: number) => String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");

/**
 * One line per metric both cards state and that differs — in passport terms.
 * `edge` says which side the numbers favour (for the per-model lists).
 */
export function comparisonHighlights(
  names: [string, string],
  a: Metrics,
  b: Metrics,
  locale: Locale
): { text: string; edge: "a" | "b" | null; label: string }[] {
  const ru = locale === "ru";
  const [na, nb] = names;
  const out: { text: string; edge: "a" | "b" | null; label: string }[] = [];

  if (a.detectM && b.detectM && a.detectM !== b.detectM) {
    const more = a.detectM > b.detectM ? "a" : "b";
    const diff = Math.abs(a.detectM - b.detectM);
    out.push({
      edge: more,
      label: ru ? "больше дальность обнаружения" : "більша дальність виявлення",
      text: ru
        ? `Дальность обнаружения человека по паспорту: ${na} — ${n(a.detectM)} м, ${nb} — ${n(b.detectM)} м (у ${more === "a" ? na : nb} на ${n(diff)} м больше).`
        : `Дальність виявлення людини за паспортом: ${na} — ${n(a.detectM)} м, ${nb} — ${n(b.detectM)} м (у ${more === "a" ? na : nb} на ${n(diff)} м більше).`,
    });
  }
  if (a.netdMk && b.netdMk && a.netdMk !== b.netdMk) {
    const better = a.netdMk < b.netdMk ? "a" : "b";
    out.push({
      edge: better,
      label: ru ? "ниже NETD" : "нижчий NETD",
      text: ru
        ? `Чувствительность NETD: ${na} — ${a.netdMk} мК, ${nb} — ${b.netdMk} мК. Меньше — лучше: картинка контрастнее в туман и дождь.`
        : `Чутливість NETD: ${na} — ${a.netdMk} мК, ${nb} — ${b.netdMk} мК. Менше — краще: картинка контрастніша в туман і дощ.`,
    });
  }
  if (a.pitchUm && b.pitchUm && a.pitchUm !== b.pitchUm) {
    out.push({
      edge: null,
      label: ru ? "шаг пикселя" : "крок пікселя",
      text: ru
        ? `Шаг пикселя: ${na} — ${a.pitchUm} мкм, ${nb} — ${b.pitchUm} мкм. С тем же объективом меньший шаг даёт больше пикселей на цели.`
        : `Крок пікселя: ${na} — ${a.pitchUm} мкм, ${nb} — ${b.pitchUm} мкм. З тим самим об'єктивом менший крок дає більше пікселів на цілі.`,
    });
  }
  if (a.lrf != null && b.lrf != null && a.lrf !== b.lrf) {
    const has = a.lrf ? "a" : "b";
    out.push({
      edge: has,
      label: ru ? "лазерный дальномер" : "лазерний далекомір",
      text: ru
        ? `Лазерный дальномер есть только у ${has === "a" ? na : nb}.`
        : `Лазерний далекомір є лише в ${has === "a" ? na : nb}.`,
    });
  }
  if (a.batteryH && b.batteryH && a.batteryH !== b.batteryH) {
    const longer = a.batteryH > b.batteryH ? "a" : "b";
    out.push({
      edge: longer,
      label: ru ? "дольше работает от аккумулятора" : "довше працює від акумулятора",
      text: ru
        ? `Работа от аккумулятора: ${na} — до ${dec(a.batteryH)} ч, ${nb} — до ${dec(b.batteryH)} ч.`
        : `Робота від акумулятора: ${na} — до ${dec(a.batteryH)} год, ${nb} — до ${dec(b.batteryH)} год.`,
    });
  }
  if (a.weightG && b.weightG && a.weightG !== b.weightG) {
    const lighter = a.weightG < b.weightG ? "a" : "b";
    out.push({
      edge: lighter,
      label: ru ? "меньше вес" : "менша вага",
      text: ru
        ? `Вес: ${na} — ${n(a.weightG)} г, ${nb} — ${n(b.weightG)} г (${lighter === "a" ? na : nb} легче на ${n(Math.abs(a.weightG - b.weightG))} г).`
        : `Вага: ${na} — ${n(a.weightG)} г, ${nb} — ${n(b.weightG)} г (${lighter === "a" ? na : nb} легший на ${n(Math.abs(a.weightG - b.weightG))} г).`,
    });
  }
  if (a.price && b.price && a.price !== b.price) {
    const cheaper = a.price < b.price ? "a" : "b";
    out.push({
      edge: cheaper,
      label: ru ? "ниже цена" : "нижча ціна",
      text: ru
        ? `Цена в Pro-Optics: ${na} — ${formatUah(a.price)}, ${nb} — ${formatUah(b.price)} (${cheaper === "a" ? na : nb} дешевле на ${formatUah(Math.abs(a.price - b.price))}).`
        : `Ціна в Pro-Optics: ${na} — ${formatUah(a.price)}, ${nb} — ${formatUah(b.price)} (${cheaper === "a" ? na : nb} дешевший на ${formatUah(Math.abs(a.price - b.price))}).`,
    });
  }
  return out;
}

/** "Однакові: матриця 640, об'єктив 35 мм" — what makes the pair comparable. */
export function sharedTraits(a: Metrics, b: Metrics, locale: Locale): string[] {
  const ru = locale === "ru";
  const out: string[] = [];
  const wa = parseInt(a.resolution || "", 10);
  if (wa && wa === parseInt(b.resolution || "", 10)) {
    out.push(ru ? `матрица ${wa}` : `матриця ${wa}`);
  }
  if (a.lensMm && a.lensMm === b.lensMm) {
    out.push(ru ? `объектив ${a.lensMm} мм` : `об'єктив ${a.lensMm} мм`);
  }
  if (a.lrf && b.lrf) out.push(ru ? "лазерный дальномер" : "лазерний далекомір");
  return out;
}
