/**
 * Normalize optics-pro.com.ua's `additionalProperty` spec list (raw Ukrainian
 * label/value pairs from product JSON-LD) into numeric/typed fields used by
 * catalog filters and scoring, while keeping every raw pair too.
 */

export type NormalizedSpecs = {
  raw: Record<string, string>;
  hPixels?: number;
  vPixels?: number;
  pixelPitchUm?: number;
  netdMk?: number;
  frequencyHz?: number;
  focalLengthMm?: number;
  magnificationMin?: number;
  magnificationMax?: number;
  detectionRangeM?: number;
  display?: string;
  displayResolution?: string;
  ip?: string;
  weightG?: number;
  dimensionsMm?: string;
  batteryType?: string;
  batteryModel?: string;
  batteryLifeH?: number;
  warrantyMonths?: number;
  hasWifi?: boolean;
  hasBluetooth?: boolean;
  memoryGb?: number;
  hasRangefinder?: boolean;
  operatingTempRange?: string;
};

function normKey(k: string): string {
  // NFC (not NFKD): Ukrainian "ї" canonically decomposes to i + combining
  // diaeresis under NFKD, which silently breaks literal-Cyrillic regexes.
  return k
    .toLowerCase()
    .normalize("NFC")
    .replace(/[’'`´ʼ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "≤35", "< 35 мК", "менше 20" -> 35 / 20; plain "20" -> 20 */
function firstNumber(value: string): number | undefined {
  const m = value.replace(",", ".").match(/-?\d+(\.\d+)?/);
  if (!m) return undefined;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : undefined;
}

/** "256х192" / "256x192" -> [256, 192] (donor uses Cyrillic х as separator) */
function splitPair(value: string): [number, number] | undefined {
  const m = value.match(/(\d+(?:\.\d+)?)\s*[xх×]\s*(\d+(?:\.\d+)?)/i);
  if (!m) return undefined;
  return [Number(m[1]), Number(m[2])];
}

function isYes(value: string): boolean {
  return /^так/i.test(value.trim());
}

const RULES: Array<{
  test: RegExp;
  apply: (out: NormalizedSpecs, value: string) => void;
}> = [
  {
    test: /(^|\s)дальність виявлення/,
    apply: (out, v) => {
      const n = firstNumber(v);
      if (n != null && out.detectionRangeM == null) out.detectionRangeM = n;
    },
  },
  {
    test: /роздільна здатність матриц|матриця.*піксел/,
    apply: (out, v) => {
      const pair = splitPair(v);
      if (pair) {
        out.hPixels = pair[0];
        out.vPixels = pair[1];
      }
    },
  },
  {
    test: /крок піксел/,
    apply: (out, v) => {
      const n = firstNumber(v);
      if (n != null) out.pixelPitchUm = n;
    },
  },
  {
    test: /netd|різниця температур/,
    apply: (out, v) => {
      const n = firstNumber(v);
      if (n != null) out.netdMk = n;
    },
  },
  {
    test: /частота матриц/,
    apply: (out, v) => {
      const n = firstNumber(v);
      if (n != null) out.frequencyHz = n;
    },
  },
  {
    test: /^обєктив,? ?мм$/,
    apply: (out, v) => {
      const n = firstNumber(v);
      if (n != null) out.focalLengthMm = n;
    },
  },
  {
    test: /мінімальна кратність збільшення/,
    apply: (out, v) => {
      const n = firstNumber(v);
      if (n != null) out.magnificationMin = n;
    },
  },
  {
    test: /максимальна кратність збільшення/,
    apply: (out, v) => {
      const n = firstNumber(v);
      if (n != null) out.magnificationMax = n;
    },
  },
  {
    test: /^збільшення,? ?х$/,
    apply: (out, v) => {
      const pair = v.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
      if (pair) {
        if (out.magnificationMin == null) out.magnificationMin = Number(pair[1]);
        if (out.magnificationMax == null) out.magnificationMax = Number(pair[2]);
      } else {
        const n = firstNumber(v);
        if (n != null) {
          if (out.magnificationMin == null) out.magnificationMin = n;
          if (out.magnificationMax == null) out.magnificationMax = n;
        }
      }
    },
  },
  {
    test: /^тип дисплею$/,
    apply: (out, v) => {
      out.display = v.trim();
    },
  },
  {
    test: /роздільна здатність дисплею/,
    apply: (out, v) => {
      out.displayResolution = v.trim();
    },
  },
  {
    test: /рівень захисту/,
    apply: (out, v) => {
      const m = v.match(/ip\s?-?\d{2}/i);
      out.ip = (m ? m[0] : v).toUpperCase().replace(/\s+/g, "");
    },
  },
  {
    test: /^вага,? ?грам$/,
    apply: (out, v) => {
      const n = firstNumber(v);
      if (n != null) out.weightG = n;
    },
  },
  {
    test: /габаритні розміри/,
    apply: (out, v) => {
      out.dimensionsMm = v.trim();
    },
  },
  {
    test: /^тип акумулятора$/,
    apply: (out, v) => {
      out.batteryModel = v.trim();
    },
  },
  {
    test: /^акумулятор$/,
    apply: (out, v) => {
      out.batteryType = v.trim();
    },
  },
  {
    test: /автономна робота/,
    apply: (out, v) => {
      const n = firstNumber(v);
      if (n != null) out.batteryLifeH = n;
    },
  },
  {
    test: /гарантія/,
    apply: (out, v) => {
      const n = firstNumber(v);
      if (n != null) out.warrantyMonths = n;
    },
  },
  {
    test: /wi-?fi/,
    apply: (out, v) => {
      out.hasWifi = isYes(v);
    },
  },
  {
    test: /bluetooth/,
    apply: (out, v) => {
      out.hasBluetooth = isYes(v);
    },
  },
  {
    test: /обєм вбудованої памяті/,
    apply: (out, v) => {
      const n = firstNumber(v);
      if (n != null) out.memoryGb = n;
    },
  },
  {
    test: /далекомір/,
    apply: (out, v) => {
      if (isYes(v)) out.hasRangefinder = true;
    },
  },
  {
    test: /температура експлуатації/,
    apply: (out, v) => {
      out.operatingTempRange = v.trim();
    },
  },
];

export function normalizeSpecs(
  rawPairs: Array<{ name: string; value: string }>
): NormalizedSpecs {
  const out: NormalizedSpecs = { raw: {} };
  for (const { name, value } of rawPairs) {
    if (!name) continue;
    out.raw[name] = value;
    const key = normKey(name);
    for (const rule of RULES) {
      if (rule.test.test(key)) rule.apply(out, value);
    }
  }
  return out;
}

/** "256x192" style string for the top-level `resolution` column, ASCII x. */
export function resolutionString(
  hPixels?: number,
  vPixels?: number
): string | null {
  if (!hPixels || !vPixels) return null;
  return `${hPixels}x${vPixels}`;
}
