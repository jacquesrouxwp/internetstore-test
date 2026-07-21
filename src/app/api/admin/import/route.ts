import { NextRequest, NextResponse } from "next/server";
import { XMLParser } from "fast-xml-parser";
import { slugify } from "@/lib/utils";
import { upsertRuntimeProduct } from "@/data/seed";
import type { Product } from "@/types";

function isAuthed(req: NextRequest) {
  return req.cookies.get("optics_admin")?.value === "1";
}

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

/**
 * Import products from Prom.ua YML/XML feed.
 * Accepts { xml: string } or multipart file field "file".
 */
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let xml = "";
  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (file && typeof file === "object" && "text" in file) {
      xml = await (file as File).text();
    }
  } else {
    const body = await req.json();
    xml = body.xml || "";
    if (body.url) {
      const res = await fetch(body.url);
      xml = await res.text();
    }
  }

  if (!xml.trim()) {
    return NextResponse.json({ error: "No XML provided" }, { status: 400 });
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const doc = parser.parse(xml);

  // YML structure: yml_catalog.shop.offers.offer
  const shop = doc?.yml_catalog?.shop || doc?.shop || doc;
  const offers = asArray(shop?.offers?.offer);
  const categories = asArray(shop?.categories?.category);

  const catMap = new Map<string, string>();
  categories.forEach((c: { "@_id"?: string; "#text"?: string }) => {
    if (c["@_id"]) catMap.set(String(c["@_id"]), String(c["#text"] || ""));
  });

  let imported = 0;
  const products: Product[] = [];

  for (const offer of offers) {
    const id = String(offer["@_id"] || offer.id || `imp-${imported}`);
    const name = String(offer.name || offer.model || "Товар");
    const price = Number(offer.price || 0);
    const oldPrice = offer.oldprice ? Number(offer.oldprice) : null;
    const pics = asArray(offer.picture).map(String).filter(Boolean);
    const desc = String(offer.description || "").replace(/<[^>]+>/g, " ");
    const vendor = String(offer.vendor || offer.vendorCode || "");
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

    const resolution =
      params["Роздільна здатність"] ||
      params["Разрешение"] ||
      params["Матриця"] ||
      null;

    const product: Product = {
      id: `prom-${id}`,
      slug: slugify(`${vendor}-${name}-${id}`).slice(0, 80),
      sku: String(offer.vendorCode || id),
      nameUk: name,
      nameRu: name,
      descriptionUk: desc,
      descriptionRu: desc,
      shortUk: desc.slice(0, 120),
      shortRu: desc.slice(0, 120),
      price,
      oldPrice,
      stock: available ? 5 : 0,
      brandName: vendor || null,
      brandSlug: vendor ? slugify(vendor) : null,
      categorySlug: "teplovizori",
      categoryId: "c1",
      resolution,
      deviceType: "mono",
      rating: 0,
      reviewsCount: 0,
      isHit: false,
      isNew: true,
      isTop: false,
      isSale: Boolean(oldPrice && oldPrice > price),
      images: pics,
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
    sample: products.slice(0, 3),
  });
}
