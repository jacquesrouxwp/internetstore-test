import type { Brand, DeviceType } from "@/types";

/**
 * Donor (optics-pro.com.ua) root category paths -> our category slug.
 * Everything not listed here is out of scope and must be skipped
 * (collimator/optical scopes, quadcopters, radios, Starlink, etc).
 */
export const CATEGORY_ROOT_MAP: Record<
  string,
  { ourSlug: string; deviceType: DeviceType | null }
> = {
  teplovizori: { ourSlug: "teplovizori", deviceType: "mono" },
  teplovizionnie_priceli: { ourSlug: "pricili", deviceType: "scope" },
  teplovizionnie_nasadki: { ourSlug: "nasadky", deviceType: "clipon" },
  teplovizionnie_binokli: { ourSlug: "binokli", deviceType: "binocular" },
  priceli_nochnogo_videniya: { ourSlug: "pricili-pnb", deviceType: "scope" },
  monokulyari_nochnogo_videniya: { ourSlug: "pnb", deviceType: "mono" },
  "pribory-nochnogo-videniya": { ourSlug: "pnb", deviceType: "mono" },
  ochki_nochnogo_videniya: { ourSlug: "pnb", deviceType: "binocular" },
  "nasadki-nv": { ourSlug: "pnb", deviceType: "clipon" },
  aksessuari_k_pnv: { ourSlug: "aksesuary", deviceType: null },
  "zaryadnye-stancii": { ourSlug: "aksesuary", deviceType: null },
};

export const DONOR_ROOT_PATHS = Object.keys(CATEGORY_ROOT_MAP);

/** First path segment of a donor product/category URL, e.g. "ua/teplovizori/x/y" -> "teplovizori" */
export function donorRootFromPath(path: string): string | null {
  const cleaned = path.replace(/^\/+/, "").replace(/^ua\//, "");
  const seg = cleaned.split("/")[0];
  return seg || null;
}

export function mapDonorCategory(
  path: string
): { ourSlug: string; deviceType: DeviceType | null } | null {
  const root = donorRootFromPath(path);
  if (!root) return null;
  return CATEGORY_ROOT_MAP[root] || null;
}

function normalizeBrandKey(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9а-яіїєґ]+/g, " ")
    .trim();
}

/** Known aliasing between donor brand labels and our brand slugs/names (normalized keys). */
const BRAND_ALIASES: Record<string, string> = Object.fromEntries(
  Object.entries({
    iray: "infiray",
    "infiray (iray)": "infiray",
    "iray (infiray)": "infiray",
    hikvision: "hikmicro",
    thermeye: "thermtec",
    "thermeye cyclops": "thermtec",
    "atn ots-hd": "atn",
    "atn ots": "atn",
  }).map(([k, v]) => [normalizeBrandKey(k), v])
);

/**
 * Match a donor brand name against our whitelist. Returns null when the
 * brand isn't one of ours -- callers must skip the product, never guess.
 */
export function matchBrand(
  donorBrandName: string | null | undefined,
  ourBrands: Brand[]
): Brand | null {
  if (!donorBrandName) return null;
  const key = normalizeBrandKey(donorBrandName);
  if (!key) return null;

  const aliasKey = BRAND_ALIASES[key];
  for (const b of ourBrands) {
    const slugKey = normalizeBrandKey(b.slug);
    const nameKey = normalizeBrandKey(b.name);
    if (slugKey === key || nameKey === key) return b;
    if (aliasKey && (slugKey === aliasKey || nameKey === aliasKey)) return b;
  }
  return null;
}

/**
 * Fallback for products where the donor's structured `brand` field is
 * empty (confirmed live: optics-pro.com.ua omits it for some Cono Tech
 * listings even though the product name plainly says "Cono Tech ..."). Only
 * call this when there was no structured brand at all -- per spec, brand is
 * "determined from the name/specs, never guessed", so this still requires
 * an exact whitelist name/slug match as a whole word in the title, it just
 * reads a different field.
 */
export function matchBrandFromName(
  productName: string,
  ourBrands: Brand[]
): Brand | null {
  const key = normalizeBrandKey(productName);
  if (!key) return null;
  const words = new Set(key.split(" "));
  for (const b of ourBrands) {
    const slugKey = normalizeBrandKey(b.slug);
    const nameKey = normalizeBrandKey(b.name);
    const nameWords = nameKey.split(" ");
    if (nameWords.every((w) => words.has(w)) || words.has(slugKey)) {
      return b;
    }
  }
  return null;
}
