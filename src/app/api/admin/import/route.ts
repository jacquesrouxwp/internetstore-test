import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { slugify } from "@/lib/utils";
import {
  getRuntimeBrands,
  getRuntimeCategories,
  upsertRuntimeBrand,
  upsertRuntimeCategory,
  upsertRuntimeProduct,
} from "@/data/seed";
import type { Brand, Category, Product } from "@/types";
import { requireAdminApi } from "@/lib/admin/auth";
import { mirrorImageToStorage } from "@/lib/admin/storage";

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function detectCategorySlug(name: string, catName: string): string {
  const s = `${name} ${catName}`.toLowerCase();
  if (/приціл.*ніч|night.*scope|пнв.*приц|пнб.*приц/.test(s))
    return "pricili-pnb";
  if (/приціл|scope|thermion|thunder/.test(s)) return "pricili";
  if (/бінокл|binoc|merger/.test(s)) return "binokli";
  if (/насадк|clip.?on|core/.test(s)) return "nasadky";
  if (/пнб|пнв|night.?vision|pvs|edge gs|nyx/.test(s)) return "pnb";
  if (/аксес|чехол|кріпл|батаре|power|mount/.test(s)) return "aksesuary";
  return "teplovizori";
}

/**
 * Import products from Prom.ua YML/XML feed.
 * Downloads <picture> URLs into Supabase Storage when configured.
 */
export async function POST(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  let xml = "";
  const contentType = req.headers.get("content-type") || "";
  let downloadImages = true;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (file && typeof file === "object" && "text" in file) {
      xml = await (file as File).text();
    }
    const urlField = form.get("url");
    if (urlField && typeof urlField === "string" && urlField.trim()) {
      const res = await fetch(urlField.trim());
      xml = await res.text();
    }
    downloadImages = form.get("downloadImages") !== "false";
  } else {
    const body = await req.json();
    xml = body.xml || "";
    downloadImages = body.downloadImages !== false;
    if (body.url) {
      const res = await fetch(body.url);
      xml = await res.text();
    }
  }

  if (!xml.trim()) {
    return NextResponse.json(
      { error: "Немає XML. Вставте фіду, завантажте файл або вкажіть URL." },
      { status: 400 }
    );
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const doc = parser.parse(xml);

  const shop = doc?.yml_catalog?.shop || doc?.shop || doc;
  const offers = asArray(shop?.offers?.offer);
  const categories = asArray(shop?.categories?.category);

  if (!offers.length) {
    return NextResponse.json(
      { error: "У фіду немає offers. Перевірте формат YML." },
      { status: 400 }
    );
  }

  // Import feed categories
  const catMap = new Map<string, string>();
  const existingCats = getRuntimeCategories();
  categories.forEach(
    (c: { "@_id"?: string; "#text"?: string; "@_parentId"?: string }) => {
      if (!c["@_id"]) return;
      const name = String(c["#text"] || "").trim();
      if (!name) return;
      catMap.set(String(c["@_id"]), name);

      const slug = slugify(name) || `cat-${c["@_id"]}`;
      if (!existingCats.some((ec) => ec.slug === slug)) {
        const cat: Category = {
          id: `prom-cat-${c["@_id"]}`,
          slug,
          nameUk: name,
          nameRu: name,
          sortOrder: existingCats.length + catMap.size,
        };
        upsertRuntimeCategory(cat);
      }
    }
  );

  let imported = 0;
  let imagesMirrored = 0;
  const products: Product[] = [];
  const brands = getRuntimeBrands();
  const catsAfter = getRuntimeCategories();

  for (const offer of offers) {
    const id = String(offer["@_id"] || offer.id || `imp-${imported}`);
    const name = String(offer.name || offer.model || "Товар");
    const price = Number(offer.price || 0);
    const oldPrice = offer.oldprice ? Number(offer.oldprice) : null;
    const picsRaw = asArray(offer.picture).map(String).filter(Boolean);
    const desc = String(offer.description || "").replace(/<[^>]+>/g, " ").trim();
    const vendor = String(offer.vendor || "").trim();
    const available =
      offer["@_available"] === undefined ||
      offer["@_available"] === "true" ||
      offer.available === true;

    const params: Record<string, string> = {};
    asArray(offer.param).forEach(
      (p: { "@_name"?: string; "#text"?: string | number }) => {
        if (p["@_name"]) params[p["@_name"]] = String(p["#text"] ?? "");
      }
    );

    // Brand
    let brandId: string | null = null;
    let brandSlug: string | null = null;
    let brandName: string | null = vendor || null;
    if (vendor) {
      brandSlug = slugify(vendor);
      const found = brands.find(
        (b) =>
          b.slug === brandSlug ||
          b.name.toLowerCase() === vendor.toLowerCase()
      );
      if (found) {
        brandId = found.id;
        brandSlug = found.slug;
        brandName = found.name;
      } else {
        const newBrand: Brand = {
          id: `prom-brand-${brandSlug}`,
          slug: brandSlug,
          name: vendor,
          logoUrl: null,
        };
        upsertRuntimeBrand(newBrand);
        brands.push(newBrand);
        brandId = newBrand.id;
      }
    }

    // Category
    const feedCatId = offer.categoryId ? String(offer.categoryId) : "";
    const feedCatName = feedCatId ? catMap.get(feedCatId) || "" : "";
    const categorySlug = detectCategorySlug(name, feedCatName);
    const cat =
      catsAfter.find((c) => c.slug === categorySlug) ||
      catsAfter.find((c) => c.slug === "teplovizori");

    const resolution =
      params["Роздільна здатність"] ||
      params["Разрешение"] ||
      params["Матриця"] ||
      params["Матрица"] ||
      null;

    const detectionRaw =
      params["Дальність виявлення людини, м"] ||
      params["Дальность обнаружения"] ||
      params["Detection range"] ||
      "";
    const detectionRangeM = detectionRaw
      ? parseInt(String(detectionRaw).replace(/\D/g, ""), 10) || null
      : null;

    // Mirror images to Storage
    let images = picsRaw;
    if (downloadImages && picsRaw.length) {
      const key = `prom-${id}`;
      images = [];
      for (let i = 0; i < picsRaw.length; i++) {
        const mirrored = await mirrorImageToStorage(picsRaw[i], key, i);
        if (mirrored !== picsRaw[i]) imagesMirrored++;
        images.push(mirrored);
      }
    }

    const product: Product = {
      id: `prom-${id}`,
      slug: slugify(`${vendor}-${name}-${id}`).slice(0, 80),
      sku: String(offer.vendorCode || id),
      nameUk: name,
      nameRu: name,
      descriptionUk: desc,
      descriptionRu: desc,
      shortUk: desc.slice(0, 160),
      shortRu: desc.slice(0, 160),
      price,
      oldPrice,
      stock: available ? 5 : 0,
      brandId,
      brandName,
      brandSlug,
      categorySlug: cat?.slug || "teplovizori",
      categoryId: cat?.id || "c1",
      resolution,
      deviceType: "mono",
      detectionRangeM,
      rating: 0,
      reviewsCount: 0,
      isHit: false,
      isNew: true,
      isTop: false,
      isSale: Boolean(oldPrice && oldPrice > price),
      images,
      specs: params,
      published: true,
      createdAt: new Date().toISOString(),
    };

    upsertRuntimeProduct(product);
    products.push(product);
    imported++;
  }

  return NextResponse.json({
    ok: true,
    imported,
    imagesMirrored,
    categoriesInFeed: catMap.size,
    sample: products.slice(0, 3).map((p) => ({
      id: p.id,
      nameUk: p.nameUk,
      price: p.price,
      images: p.images.length,
    })),
  });
}
