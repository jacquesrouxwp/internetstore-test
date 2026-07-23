import { NextRequest, NextResponse } from "next/server";
import type { DeviceType, Product } from "@/types";
import { slugify } from "@/lib/utils";
import { requireAdminApi } from "@/lib/admin/auth";
import { hasServiceSupabase } from "@/lib/supabase/service";
import {
  adminDeleteProduct,
  adminGetProduct,
  adminListBrands,
  adminListCategories,
  adminListProducts,
  adminUpsertProduct,
} from "@/lib/db/admin-repo";
import {
  deleteRuntimeProduct,
  getRuntimeBrands,
  getRuntimeCategories,
  getRuntimeProductById,
  getRuntimeProducts,
  upsertRuntimeProduct,
} from "@/data/seed";

function buildProduct(
  body: Record<string, unknown>,
  existing?: Product | null,
  brands: { id: string; slug: string; name: string }[] = [],
  cats: { id: string; slug: string }[] = []
): Product {
  const id =
    (body.id as string) ||
    existing?.id ||
    `new-${Date.now()}`;

  const nameUk = String(body.nameUk || body.name_uk || existing?.nameUk || "");
  const nameRu = String(
    body.nameRu || body.name_ru || existing?.nameRu || nameUk
  );
  const slug =
    (body.slug as string) ||
    existing?.slug ||
    slugify(nameUk || `product-${id}`).slice(0, 80);

  let brandId = (body.brandId as string) || existing?.brandId || null;
  let brandSlug = existing?.brandSlug || null;
  let brandName = (body.brandName as string) || existing?.brandName || null;

  if (body.brandId) {
    const b = brands.find((x) => x.id === body.brandId);
    if (b) {
      brandId = b.id;
      brandSlug = b.slug;
      brandName = b.name;
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
  const images = Array.isArray(body.images)
    ? (body.images as string[]).filter(Boolean)
    : existing?.images || [];

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
      (body.descriptionUk as string) ?? existing?.descriptionUk ?? "",
    descriptionRu:
      (body.descriptionRu as string) ?? existing?.descriptionRu ?? "",
    shortUk: (body.shortUk as string) ?? existing?.shortUk ?? "",
    shortRu: (body.shortRu as string) ?? existing?.shortRu ?? "",
    price,
    oldPrice,
    stock: Number(body.stock ?? existing?.stock ?? 0),
    brandId,
    brandSlug,
    brandName,
    categoryId,
    categorySlug,
    resolution: (body.resolution as string) ?? existing?.resolution ?? null,
    deviceType: ((body.deviceType as DeviceType) ||
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
    isSale:
      body.isSale != null
        ? Boolean(body.isSale)
        : Boolean(oldPrice && oldPrice > price),
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

  try {
    if (hasServiceSupabase()) {
      const id = req.nextUrl.searchParams.get("id");
      if (id) {
        const product = await adminGetProduct(id);
        if (!product) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json({ product, source: "supabase" });
      }
      const q = req.nextUrl.searchParams.get("q") || undefined;
      const [products, brands, categories] = await Promise.all([
        adminListProducts(q),
        adminListBrands(),
        adminListCategories(),
      ]);
      return NextResponse.json({
        products,
        brands,
        categories,
        source: "supabase",
      });
    }

    // memory fallback
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const product = getRuntimeProductById(id);
      if (!product)
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ product, source: "memory" });
    }
    return NextResponse.json({
      products: getRuntimeProducts(),
      brands: getRuntimeBrands(),
      categories: getRuntimeCategories(),
      source: "memory",
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
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

  try {
    if (hasServiceSupabase()) {
      const [brands, cats] = await Promise.all([
        adminListBrands(),
        adminListCategories(),
      ]);
      const product = buildProduct(body, null, brands, cats);
      const saved = await adminUpsertProduct(product, true);
      return NextResponse.json({ product: saved, source: "supabase" });
    }
    const product = buildProduct(
      body,
      null,
      getRuntimeBrands(),
      getRuntimeCategories()
    );
    upsertRuntimeProduct(product);
    return NextResponse.json({ product, source: "memory" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;
  const body = await req.json();
  const id = body.id as string;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  try {
    if (hasServiceSupabase()) {
      const existing = await adminGetProduct(id);
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const [brands, cats] = await Promise.all([
        adminListBrands(),
        adminListCategories(),
      ]);
      const product = buildProduct(body, existing, brands, cats);
      const saved = await adminUpsertProduct(product, false);
      return NextResponse.json({ product: saved, source: "supabase" });
    }
    const existing = getRuntimeProductById(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const product = buildProduct(
      body,
      existing,
      getRuntimeBrands(),
      getRuntimeCategories()
    );
    upsertRuntimeProduct(product);
    return NextResponse.json({ product, source: "memory" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  try {
    if (hasServiceSupabase()) {
      await adminDeleteProduct(id);
      return NextResponse.json({ ok: true, source: "supabase" });
    }
    deleteRuntimeProduct(id);
    return NextResponse.json({ ok: true, source: "memory" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
