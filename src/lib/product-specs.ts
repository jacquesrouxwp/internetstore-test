/**
 * Localize + de-duplicate product characteristic labels for PDP,
 * then group into readable sections (matrix / optics / power / …).
 */

export type SpecRow = {
  key: string;
  label: string;
  value: string;
  /** Original specs key before canonical collapse — used for section routing. */
  sourceKey?: string;
};

export type SpecSectionId =
  | "main"
  | "matrix"
  | "optics"
  | "display"
  | "rangefinder"
  | "ops"
  | "power"
  | "features"
  | "package";

export type SpecSection = {
  id: SpecSectionId;
  rows: SpecRow[];
};

export const SPEC_SECTION_ORDER: SpecSectionId[] = [
  "main",
  "matrix",
  "optics",
  "display",
  "rangefinder",
  "ops",
  "power",
  "features",
  "package",
];

/**
 * Keys the storefront must never render: anything underscore-prefixed is
 * internal bookkeeping (import source URL, timestamps, review flags).
 */
export function isInternalSpecKey(key: string): boolean {
  return key.trim().startsWith("_");
}

/**
 * Normalized keys the importer writes so filters, sliders and scoring have
 * numbers to work with. They duplicate the donor's own human-readable rows
 * (weightG "291.5" alongside "Вага, грам" "291.5"), so the storefront showed
 * every value twice -- once in Ukrainian, once as raw camelCase. Kept in the
 * database, hidden from shoppers. Listed explicitly rather than matched by
 * shape, so a genuine latin-named donor characteristic is not swallowed.
 */
const TECHNICAL_SPEC_KEYS = new Set([
  "pixelPitchUm",
  "netdMk",
  "frequencyHz",
  "focalLengthMm",
  "magnificationMin",
  "magnificationMax",
  "display",
  "displayResolution",
  "ip",
  "weightG",
  "dimensionsMm",
  "batteryType",
  "batteryModel",
  "batteryLifeH",
  "warrantyMonths",
  "hasWifi",
  "hasBluetooth",
  "memoryGb",
  "hasRangefinder",
  "operatingTempRange",
]);

export function isTechnicalSpecKey(key: string): boolean {
  return TECHNICAL_SPEC_KEYS.has(key.trim());
}

/** Drop internal keys from a specs object (admin display, exports, etc). */
export function stripInternalSpecs(
  specs: Record<string, string> | null | undefined
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(specs || {})) {
    if (!isInternalSpecKey(k)) out[k] = v;
  }
  return out;
}

/** Canonical keys used in seed / admin / DB */
const LABEL_MAP: Record<string, { uk: string; ru: string }> = {
  "Дальність виявлення людини, м": {
    uk: "Дальність виявлення людини, м",
    ru: "Дальность обнаружения человека, м",
  },
  "Дальность обнаружения человека, м": {
    uk: "Дальність виявлення людини, м",
    ru: "Дальность обнаружения человека, м",
  },
  Матриця: { uk: "Матриця", ru: "Матрица" },
  Матрица: { uk: "Матриця", ru: "Матрица" },
  Захист: { uk: "Захист", ru: "Защита" },
  Защита: { uk: "Захист", ru: "Защита" },
  Частота: { uk: "Частота", ru: "Частота" },
  NETD: { uk: "NETD", ru: "NETD" },
  "Об'єктив": { uk: "Об'єктив", ru: "Объектив" },
  Объектив: { uk: "Об'єктив", ru: "Объектив" },
  Збільшення: { uk: "Збільшення", ru: "Увеличение" },
  Увеличение: { uk: "Збільшення", ru: "Увеличение" },
  Дисплей: { uk: "Дисплей", ru: "Дисплей" },
  Живлення: { uk: "Живлення", ru: "Питание" },
  Питание: { uk: "Живлення", ru: "Питание" },
  Вага: { uk: "Вага", ru: "Вес" },
  Вес: { uk: "Вага", ru: "Вес" },
  Габарити: { uk: "Габарити", ru: "Габариты" },
  Габариты: { uk: "Габарити", ru: "Габариты" },
  "Поле зору": { uk: "Поле зору", ru: "Поле зрения" },
  "Поле зрения": { uk: "Поле зору", ru: "Поле зрения" },
  resolution: { uk: "Матриця", ru: "Матрица" },
  detection: {
    uk: "Дальність виявлення людини, м",
    ru: "Дальность обнаружения человека, м",
  },
};

/** Normalize key for dedupe (near-duplicate labels collapse) */
function canonicalGroup(raw: string): string {
  const k = raw.trim().toLowerCase();
  // Keep detection vs recognition as separate rows (both go into "main").
  if (
    k.includes("розпізн") ||
    k.includes("распозн") ||
    k.includes("recognition")
  ) {
    return "recognition";
  }
  if (
    k.includes("виявлен") ||
    k.includes("обнаруж") ||
    k.includes("detection") ||
    (k.includes("дальн") && !k.includes("далекомір") && !k.includes("дальномер"))
  ) {
    return "detection";
  }
  // Frequency / NETD / pitch must be checked BEFORE bare "матриц*" —
  // otherwise "Частота матриці" or "NETD матриці" steals the resolution slot
  // and the actual 384×288 / 640×480 row never reaches the storefront.
  if (k.includes("частот") || k.includes("hz") || k.includes("гц")) return "freq";
  if (k.includes("netd") || k.includes("різниця температур") || k.includes("разница температур"))
    return "netd";
  if (
    k.includes("крок піксел") ||
    k.includes("шаг пиксел") ||
    k.includes("pixel pitch") ||
    k.includes("pitch")
  ) {
    return "pitch";
  }
  // True sensor resolution only (not "частота матриці", not display resolution)
  if (
    k === "resolution" ||
    k === "матриця" ||
    k === "матрица" ||
    (k.includes("роздільн") && k.includes("матриц")) ||
    (k.includes("разрешен") && k.includes("матриц")) ||
    (k.includes("матриц") &&
      !k.includes("диспле") &&
      !k.includes("display") &&
      !k.includes("частот"))
  ) {
    return "matrix_res";
  }
  if (
    k.includes("захист") ||
    k.includes("защит") ||
    /\bip\s*\d/i.test(k) ||
    k === "ip"
  ) {
    return "protection";
  }
  return k;
}

/**
 * Route a characteristic into a PDP section. Order of checks matters —
 * more specific (LRF, battery, display) before broad (main).
 */
export function classifySpecKey(raw: string): SpecSectionId {
  const k = raw.trim().toLowerCase();

  if (
    k.includes("комплектац") ||
    k.includes("комплект постав") ||
    k.includes("package") ||
    k.includes("in the box") ||
    k.includes("в комплект")
  ) {
    return "package";
  }

  if (
    k.includes("далекомір") ||
    k.includes("дальномер") ||
    k.includes("rangefinder") ||
    /\blrf\b/.test(k) ||
    k.includes("лазер") ||
    k.includes("точність вимірюван") ||
    k.includes("точность измерен")
  ) {
    return "rangefinder";
  }

  if (
    k.includes("диспле") ||
    k.includes("display") ||
    k.includes("палітр") ||
    k.includes("палитр") ||
    k.includes("amoled") ||
    k.includes("oled") ||
    k.includes("lcos")
  ) {
    return "display";
  }

  if (
    k.includes("живлен") ||
    k.includes("питан") ||
    k.includes("батаре") ||
    k.includes("акумулятор") ||
    k.includes("аккумулятор") ||
    k.includes("автоном") ||
    k.includes("runtime") ||
    k.includes("battery") ||
    k.includes("ємність") ||
    k.includes("емкость") ||
    k.includes("powerbank") ||
    k.includes("microusb") ||
    k.includes("micro-usb") ||
    /\busb\b/.test(k)
  ) {
    return "power";
  }

  if (
    k.includes("wifi") ||
    k.includes("wi-fi") ||
    k.includes("wi‑fi") ||
    k.includes("bluetooth") ||
    k.includes("відеозапис") ||
    k.includes("видеозапис") ||
    k.includes("відео і фото") ||
    k.includes("видео и фото") ||
    k.includes("мікрофон") ||
    k.includes("микрофон") ||
    k.includes("гіроскоп") ||
    k.includes("гироскоп") ||
    k.includes("компас") ||
    k.includes("recorder") ||
    k.includes("балістичн") ||
    k.includes("баллистич") ||
    /\bpip\b/.test(k) ||
    k.includes("picture-in-picture") ||
    k.includes("функці") ||
    k.includes("функци") ||
    k.includes("фотозйом") ||
    k.includes("фотосъем") ||
    k.includes("запис фото") ||
    k.includes("запись фото") ||
    k.includes("відеовихід") ||
    k.includes("видеовыход") ||
    k.includes("microhdmi") ||
    k.includes("microsd") ||
    k.includes("пам’ят") ||
    k.includes("пам'ят") ||
    k.includes("памят")
  ) {
    return "features";
  }

  if (
    k.includes("матриц") ||
    k.includes("sensor") ||
    k.includes("netd") ||
    k.includes("pixel") ||
    k.includes("pitch") ||
    k.includes("піксел") ||
    k.includes("пиксель") ||
    k.includes("крок піксел") ||
    k.includes("шаг пиксел") ||
    k.includes("ядро") ||
    k.includes("калібрув") ||
    k.includes("калибров") ||
    (k.includes("частот") && !k.includes("дискретиз")) ||
    (k.includes("роздільн") && (k.includes("матриц") || k.includes("сенсор"))) ||
    (k.includes("разрешен") && (k.includes("матриц") || k.includes("сенсор"))) ||
    k === "resolution" ||
    k === "частота"
  ) {
    return "matrix";
  }

  if (
    k.includes("об'єктив") ||
    k.includes("объектив") ||
    k.includes("об єктив") || // broken apostrophe variants from donors
    k.includes("об ектив") ||
    k.includes("поле зору") ||
    k.includes("поле зрения") ||
    k.includes("кут поля") ||
    k.includes("угол поля") ||
    k.includes("збільшен") ||
    k.includes("увеличен") ||
    k.includes("magnif") ||
    k.includes("фокус") ||
    k.includes("діоптр") ||
    k.includes("диоптр") ||
    k.includes("зіниц") ||
    k.includes("зрачк") ||
    k.includes("окуляр") ||
    k.includes("eye relief") ||
    k.includes("zoom") ||
    k.includes("оптичн") ||
    k.includes("focal") ||
    k.includes("світлосил") ||
    k.includes("светосил") ||
    k.includes("кратність") ||
    k.includes("кратность")
  ) {
    return "optics";
  }

  if (
    k.includes("температур") ||
    k.includes("водозахист") ||
    k.includes("водозащит") ||
    k.includes("габарит") ||
    k.includes("розмір") ||
    k.includes("размер") ||
    k.includes("вага") ||
    k.includes("вес") ||
    k.includes("weight") ||
    k.includes("dimension") ||
    k.includes("ударо") ||
    k.includes("humidity") ||
    k.includes("захист") ||
    k.includes("защит") ||
    k.includes("корпус") ||
    k.includes("ip рейтинг") ||
    k.includes("ip-рейтинг") ||
    /\bip\b/.test(k)
  ) {
    return "ops";
  }

  // Type, detection/recognition ranges, mounts, warranty → main
  return "main";
}

export function groupSpecRows(rows: SpecRow[]): SpecSection[] {
  const buckets = new Map<SpecSectionId, SpecRow[]>();
  for (const id of SPEC_SECTION_ORDER) buckets.set(id, []);

  for (const row of rows) {
    const id = classifySpecKey(row.sourceKey || row.label || row.key);
    buckets.get(id)!.push(row);
  }

  return SPEC_SECTION_ORDER.filter((id) => (buckets.get(id)?.length || 0) > 0).map(
    (id) => ({ id, rows: buckets.get(id)! })
  );
}

function localizeLabel(raw: string, locale: string): string {
  const entry = LABEL_MAP[raw.trim()];
  if (entry) return locale === "ru" ? entry.ru : entry.uk;
  // fallback: keep as-is
  return raw;
}

/**
 * Build unique, localized spec rows for a product.
 * Skips duplicate detection-range when present both in specs and detectionRangeM.
 */
export function buildSpecRows(
  specs: Record<string, string> | null | undefined,
  opts: {
    locale: string;
    resolution?: string | null;
    detectionRangeM?: number | null;
  }
): SpecRow[] {
  const locale = opts.locale === "ru" ? "ru" : "uk";
  const seen = new Set<string>();
  const rows: SpecRow[] = [];

  const push = (rawKey: string, value: string) => {
    if (!value?.trim()) return;
    // Internal bookkeeping keys (import provenance etc.) are never shown to
    // shoppers -- they leaked onto live product pages, donor URL included.
    if (isInternalSpecKey(rawKey) || isTechnicalSpecKey(rawKey)) return;
    const group = canonicalGroup(rawKey);
    if (seen.has(group)) return;
    seen.add(group);
    rows.push({
      key: group,
      label: localizeLabel(rawKey, locale),
      value: value.trim(),
      sourceKey: rawKey,
    });
  };

  // Prefer clean typed columns first so donor combo-keys like
  // "Матриця: пікселі, мкм, NETD" cannot claim the resolution slot.
  if (opts.resolution) {
    push("Матриця", opts.resolution);
  }

  if (opts.detectionRangeM != null && Number.isFinite(opts.detectionRangeM)) {
    push(
      locale === "ru"
        ? "Дальность обнаружения человека, м"
        : "Дальність виявлення людини, м",
      String(opts.detectionRangeM)
    );
  }

  for (const [k, v] of Object.entries(specs || {})) {
    push(k, String(v));
  }

  return rows;
}
