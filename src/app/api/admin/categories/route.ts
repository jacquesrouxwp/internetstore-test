import { NextRequest, NextResponse } from "next/server";
import {
  deleteRuntimeCategory,
  getRuntimeCategories,
  upsertRuntimeCategory,
} from "@/data/seed";
import type { Category } from "@/types";
import { slugify } from "@/lib/utils";
import { requireAdminApi } from "@/lib/admin/auth";

export async function GET(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;
  return NextResponse.json({ categories: getRuntimeCategories() });
}

export async function POST(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const body = await req.json();
  const nameUk = String(body.nameUk || "").trim();
  if (!nameUk) {
    return NextResponse.json(
      { error: "Назва (УКР) обов'язкова" },
      { status: 400 }
    );
  }

  const id = body.id || `cat-${Date.now()}`;
  const cat: Category = {
    id,
    slug: body.slug || slugify(nameUk),
    nameUk,
    nameRu: String(body.nameRu || nameUk).trim(),
    descriptionUk: body.descriptionUk || null,
    descriptionRu: body.descriptionRu || null,
    parentId: body.parentId || null,
    sortOrder: Number(body.sortOrder ?? getRuntimeCategories().length + 1),
  };

  upsertRuntimeCategory(cat);
  return NextResponse.json({ category: cat });
}

export async function PUT(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const existing = getRuntimeCategories().find((c) => c.id === body.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const cat: Category = {
    ...existing,
    slug: body.slug || existing.slug,
    nameUk: body.nameUk != null ? String(body.nameUk) : existing.nameUk,
    nameRu: body.nameRu != null ? String(body.nameRu) : existing.nameRu,
    descriptionUk:
      body.descriptionUk !== undefined
        ? body.descriptionUk
        : existing.descriptionUk,
    descriptionRu:
      body.descriptionRu !== undefined
        ? body.descriptionRu
        : existing.descriptionRu,
    parentId:
      body.parentId !== undefined ? body.parentId : existing.parentId,
    sortOrder:
      body.sortOrder != null
        ? Number(body.sortOrder)
        : existing.sortOrder,
  };

  upsertRuntimeCategory(cat);
  return NextResponse.json({ category: cat });
}

export async function DELETE(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  deleteRuntimeCategory(id);
  return NextResponse.json({ ok: true });
}
