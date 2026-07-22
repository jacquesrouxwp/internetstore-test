import { NextRequest, NextResponse } from "next/server";
import {
  deleteRuntimeProduct,
  getRuntimeBrands,
  getRuntimeCategories,
  getRuntimeProductById,
  getRuntimeProducts,
  upsertRuntimeProduct,
} from "@/data/seed";
import type { DeviceType, Product } from "@/types";
import { slugify } from "@/lib/utils";
import { requireAdminApi } from "@/lib/admin/auth";

function buildProduct(body: Record<string, unknown>, existing?: Product | null): Product {
  const id =
    (body.id as string) ||
    existing?.id ||
    `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const nameUk = String(body.nameUk || body.name_uk || existing?.nameUk || "");
  const nameRu = String(
    body.nameRu || body.name_ru || existing?.nameRu || nameUk
  );
  const slug =
    (body.slug as string) ||
    existing?.slug ||
    slugify(nameUk || `product-${id}`).slice(0, 80);

  const brands = getRuntimeBrands();
  const cats = getRuntimeCategories();

  let brandId = (body.brandId as string) || existing?.brandId || null;
  let brandSlug = (body.brandSlug as string) || existing?.brandSlug || null;
  let brandName = (body.brandName as string) || existing?.brandName || null;

  if (body.brandId) {
    const b = brands.find((x) => x.id === body.brandId);
    if (b) {
      brandId = b.id;
      brandSlug = b.slug;
      brandName = b.name;
    }
  } else if (body.brandName && !brandId) {
    brandName = String(body.brandName);
    brandSlug = slugify(brandName);
    const found = brands.find(
      (x) => x.slug === brandSlug || x.name.toLowerCase() === brandName!.toLowerCase()
    );
    if (found) {
      brandId = found.id;
      brandSlug = found.slug;
      brandName = found.name;
    }
  }

  let categoryId =
    (body.categoryId as string) || existing?.categoryId || null;
  let categorySlug =
    (body.categorySlug as string) || existing?.categorySlug || null;

  if (body.categoryId) {
    const c = cats.find((x) => x.id === body.categoryId);
    if (c) {
      categoryId = c.id;
      categorySlug = c.slug;
    }
  } else if (body.categorySlug) {
    const c = cats.find((x) => x.slug === body.categorySlug);
    if (c) {
      categoryId = c.id;
      categorySlug = c.slug;
    }
  }

  if (!categorySlug) {
    categorySlug = "teplovizori";
    categoryId = cats.find((c) => c.slug === "teplovizori")?.id || "c1";
  }

  const detectionRangeM =
    body.detectionRangeM != null && body.detectionRangeM !== ""
      ? Number(body.detectionRangeM)
      : existing?.detectionRangeM ?? null;

  const specs: Record<string, string> = {
    ...(existing?.specs || {}),
    ...((body.specs as Record<string, string>) || {}),
  };

  if (detectionRangeM != null && !Number.isNaN(detectionRangeM)) {
    specs["Дальність виявлення людини, м"] = String(detectionRangeM);
  }

  const oldPrice =
    body.oldPrice != null && body.oldPrice !== ""
      ? Number(body.oldPrice)
      : body.oldPrice === null
        ? null
        : existing?.oldPrice ?? null;

  const price = Number(body.price ?? existing?.price ?? 0);
  const isSale =
    body.isSale != null
      ? Boolean(body.isSale)
      : Boolean(oldPrice && oldPrice > price);

  const images = Array.isArray(body.images)
    ? (body.images as string[]).filter(Boolean)
    : existing?.images || [];

  // Main image = first in array
  const mainIndex =
    typeof body.mainImageIndex === "number" ? body.mainImageIndex : 0;
  if (images.length > 1 && mainIndex > 0 && mainIndex < images.length) {
    const [main] = images.splice(mainIndex, 1);
    images.unshift(main);
  }

  return {
    id,
    slug,
    sku: (body.sku as string) ?? existing?.sku ?? null,
    nameUk,
    nameRu,
    descriptionUk:
      (body.descriptionUk as string) ??
      (body.description_uk as string) ??
      existing?.descriptionUk ??
      "",
    descriptionRu:
      (body.descriptionRu as string) ??
      (body.description_ru as string) ??
      existing?.descriptionRu ??
      "",
    shortUk:
      (body.shortUk as string) ??
      existing?.shortUk ??
      "",
    shortRu:
      (body.shortRu as string) ??
      existing?.shortRu ??
      "",
    price,
    oldPrice,
    stock: Number(body.stock ?? existing?.stock ?? 0),
    brandId,
    brandSlug,
    brandName,
    categoryId,
    categorySlug,
    resolution:
      (body.resolution as string) ?? existing?.resolution ?? null,
    deviceType:
      ((body.deviceType as DeviceType) ||
        existing?.deviceType ||
        "mono") as DeviceType,
    detectionRangeM:
      detectionRangeM != null && !Number.isNaN(detectionRangeM)
        ? detectionRangeM
        : null,
    rating: Number(body.rating ?? existing?.rating ?? 0),
    reviewsCount: Number(body.reviewsCount ?? existing?.reviewsCount ?? 0),
    isHit: body.isHit != null ? Boolean(body.isHit) : Boolean(existing?.isHit),
    isNew: body.isNew != null ? Boolean(body.isNew) : Boolean(existing?.isNew),
    isTop: body.isTop != null ? Boolean(body.isTop) : Boolean(existing?.isTop),
    isSale,
    images,
    specs,
    published:
      body.published != null
        ? Boolean(body.published)
        : existing?.published !== false,
    createdAt: existing?.createdAt || new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (id) {
    const product = getRuntimeProductById(id);
    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ product });
  }

  const q = (req.nextUrl.searchParams.get("q") || "").toLowerCase();
  let products = getRuntimeProducts();
  if (q) {
    products = products.filter(
      (p) =>
        p.nameUk.toLowerCase().includes(q) ||
        p.nameRu.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.brandName || "").toLowerCase().includes(q)
    );
  }

  return NextResponse.json({
    products,
    brands: getRuntimeBrands(),
    categories: getRuntimeCategories(),
  });
}

export async function POST(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const body = await req.json();
  if (!body.nameUk && !body.name_uk) {
    return NextResponse.json(
      { error: "Назва (УКР) обов'язкова" },
      { status: 400 }
    );
  }

  const product = buildProduct(body);
  upsertRuntimeProduct(product);
  return NextResponse.json({ product });
}

export async function PUT(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const body = await req.json();
  const id = body.id as string;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const existing = getRuntimeProductById(id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const product = buildProduct(body, existing);
  upsertRuntimeProduct(product);
  return NextResponse.json({ product });
}

export async function DELETE(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  deleteRuntimeProduct(id);
  return NextResponse.json({ ok: true });
}
