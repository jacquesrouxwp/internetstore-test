import type { Brand, Category, DeviceType, Product } from "@/types";
import { slugify } from "@/lib/utils";
import type { ParsedDonorProduct } from "./optics-pro-scraper";
import { normalizeSpecs, resolutionString } from "./optics-pro-normalize";

/**
 * Turn one scraped+parsed donor product into a Product ready for
 * adminUpsertProduct. Caller has already resolved brand/category and decided
 * the product is in scope (whitelisted brand + mapped category).
 *
 * Per explicit product decision: specs are normalized as usual, but
 * descriptions are carried over verbatim from the donor for now -- a separate
 * follow-up task rewrites them before publish. Import always lands as a draft
 * (`published: false`). Nothing is written into `specs` except real product
 * characteristics: specs renders straight onto the public product page.
 */
export function buildProductRecord(
  parsed: ParsedDonorProduct,
  brand: Brand,
  category: Category,
  deviceType: DeviceType | null,
  existing: Product | null
): Omit<Product, "id" | "rating" | "reviewsCount" | "createdAt"> & {
  id?: string;
} {
  const normalized = normalizeSpecs(parsed.specPairs);
  const skuOrModel = (parsed.sku || parsed.model || "").trim();
  const resolution = resolutionString(normalized.hPixels, normalized.vPixels);

  const specs: Record<string, string> = { ...normalized.raw };
  const setSpec = (k: string, v: unknown) => {
    if (v != null && v !== "") specs[k] = String(v);
  };
  setSpec("pixelPitchUm", normalized.pixelPitchUm);
  setSpec("netdMk", normalized.netdMk);
  setSpec("frequencyHz", normalized.frequencyHz);
  setSpec("focalLengthMm", normalized.focalLengthMm);
  setSpec("magnificationMin", normalized.magnificationMin);
  setSpec("magnificationMax", normalized.magnificationMax);
  setSpec("display", normalized.display);
  setSpec("displayResolution", normalized.displayResolution);
  setSpec("ip", normalized.ip);
  setSpec("weightG", normalized.weightG);
  setSpec("dimensionsMm", normalized.dimensionsMm);
  setSpec("batteryType", normalized.batteryType);
  setSpec("batteryModel", normalized.batteryModel);
  setSpec("batteryLifeH", normalized.batteryLifeH);
  setSpec("warrantyMonths", normalized.warrantyMonths);
  if (normalized.hasWifi != null) specs.hasWifi = String(normalized.hasWifi);
  if (normalized.hasBluetooth != null)
    specs.hasBluetooth = String(normalized.hasBluetooth);
  setSpec("memoryGb", normalized.memoryGb);
  if (normalized.hasRangefinder != null)
    specs.hasRangefinder = String(normalized.hasRangefinder);
  setSpec("operatingTempRange", normalized.operatingTempRange);

  // No bookkeeping keys go into specs: specs is rendered verbatim on the
  // product page, so the previous _sourceSite/_sourceUrl/_importedAt/
  // _rewriteNeeded entries showed up in the public characteristics table --
  // donor URL and all. Dedupe does not need them (it matches on brand + sku).

  const description = parsed.descriptionRaw || null;
  const inStock = parsed.availability === "InStock";

  const slugBase = `${brand.slug}-${parsed.name}-${skuOrModel}`;
  const slug = (existing?.slug || slugify(slugBase).slice(0, 90)) || slugify(parsed.name);

  return {
    id: existing?.id,
    slug,
    sku: skuOrModel || null,
    nameUk: parsed.name,
    nameRu: parsed.name,
    descriptionUk: description,
    descriptionRu: description,
    shortUk: description ? description.slice(0, 160) : null,
    shortRu: description ? description.slice(0, 160) : null,
    price: parsed.price ?? 0,
    oldPrice: null,
    stock: inStock ? 5 : 0,
    brandId: brand.id,
    brandSlug: brand.slug,
    brandName: brand.name,
    categoryId: category.id,
    categorySlug: category.slug,
    resolution,
    deviceType,
    detectionRangeM: normalized.detectionRangeM ?? null,
    isHit: existing?.isHit ?? false,
    isNew: existing?.isNew ?? true,
    isTop: existing?.isTop ?? false,
    isSale: existing?.isSale ?? false,
    images: parsed.images,
    imageAlts: parsed.images.map(() => parsed.name),
    specs,
    published: false,
    metaTitleUk: existing?.metaTitleUk ?? null,
    metaTitleRu: existing?.metaTitleRu ?? null,
    metaDescriptionUk: existing?.metaDescriptionUk ?? null,
    metaDescriptionRu: existing?.metaDescriptionRu ?? null,
  };
}

export type ImportRowResult =
  | {
      status: "created" | "updated";
      url: string;
      name: string;
      brandSlug: string;
      categorySlug: string;
      price: number | null;
      imageCount: number;
      imagesConsistent: boolean;
      missingPrice: boolean;
      fewSpecs: boolean;
    }
  | {
      status: "skipped";
      url: string;
      reason: string;
    };
