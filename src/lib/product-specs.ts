/**
 * Localize + de-duplicate product characteristic labels for PDP.
 */

export type SpecRow = { key: string; label: string; value: string };

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

/** Normalize key for dedupe (detection / matrix variants collapse) */
function canonicalGroup(raw: string): string {
  const k = raw.trim().toLowerCase();
  if (
    k.includes("дальн") ||
    k.includes("detection") ||
    k.includes("виявлен") ||
    k.includes("обнаруж")
  ) {
    return "detection";
  }
  if (k.includes("матриц") || k === "resolution") return "matrix";
  if (k.includes("захист") || k.includes("защит") || k.includes("ip"))
    return "protection";
  if (k.includes("частот") || k.includes("hz") || k.includes("гц")) return "freq";
  if (k.includes("netd")) return "netd";
  return k;
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
    const group = canonicalGroup(rawKey);
    if (seen.has(group)) return;
    seen.add(group);
    rows.push({
      key: group,
      label: localizeLabel(rawKey, locale),
      value: value.trim(),
    });
  };

  for (const [k, v] of Object.entries(specs || {})) {
    push(k, String(v));
  }

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

  return rows;
}
