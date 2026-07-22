import { NextRequest, NextResponse } from "next/server";
import {
  deleteRuntimeProduct,
  getRuntimeProducts,
  upsertRuntimeProduct,
} from "@/data/seed";
import type { Product } from "@/types";
import { slugify } from "@/lib/utils";
import { cookies } from "next/headers";

function isAuthed(req: NextRequest) {
  const cookie = req.cookies.get("optics_admin")?.value;
  return cookie === "1" || cookie === process.env.ADMIN_SESSION_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ products: getRuntimeProducts() });
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const id = body.id || `p-${Date.now()}`;
  const slug =
    body.slug ||
    slugify(body.nameUk || body.name_uk || `product-${id}`);

  const product: Product = {
    id,
    slug,
    sku: body.sku || null,
    nameUk: body.nameUk || body.name_uk || "",
    nameRu: body.nameRu || body.name_ru || body.nameUk || "",
    descriptionUk: body.descriptionUk || body.description_uk || "",
    descriptionRu: body.descriptionRu || body.description_ru || "",
    shortUk: body.shortUk || body.short_uk || "",
    shortRu: body.shortRu || body.short_ru || "",
    price: Number(body.price || 0),
    oldPrice: body.oldPrice != null ? Number(body.oldPrice) : null,
    stock: Number(body.stock ?? 0),
    brandId: body.brandId || null,
    brandSlug: body.brandSlug || null,
    brandName: body.brandName || null,
    categoryId: body.categoryId || "c1",
    categorySlug: body.categorySlug || "teplovizori",
    resolution: body.resolution || null,
    deviceType: body.deviceType || "mono",
    detectionRangeM:
      body.detectionRangeM != null && body.detectionRangeM !== ""
        ? Number(body.detectionRangeM)
        : null,
    rating: Number(body.rating ?? 0),
    reviewsCount: Number(body.reviewsCount ?? 0),
    isHit: Boolean(body.isHit),
    isNew: Boolean(body.isNew),
    isTop: Boolean(body.isTop),
    isSale: Boolean(body.isSale || (body.oldPrice && body.oldPrice > body.price)),
    images: Array.isArray(body.images) ? body.images : [],
    specs: {
      ...(body.specs || {}),
      ...(body.detectionRangeM
        ? {
            "Дальність виявлення людини, м": String(
              Number(body.detectionRangeM)
            ),
          }
        : {}),
    },
    published: body.published !== false,
    createdAt: body.createdAt || new Date().toISOString(),
  };

  upsertRuntimeProduct(product);
  return NextResponse.json({ product });
}

export async function DELETE(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  deleteRuntimeProduct(id);
  return NextResponse.json({ ok: true });
}

// silence unused import warning in some tooling
void cookies;
