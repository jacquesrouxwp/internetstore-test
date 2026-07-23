import { NextRequest, NextResponse } from "next/server";
import type { Category } from "@/types";
import { slugify } from "@/lib/utils";
import { requireAdminApi } from "@/lib/admin/auth";
import { hasServiceSupabase } from "@/lib/supabase/service";
import {
  adminDeleteCategory,
  adminListCategories,
  adminUpsertCategory,
} from "@/lib/db/admin-repo";
import {
  deleteRuntimeCategory,
  getRuntimeCategories,
  upsertRuntimeCategory,
} from "@/data/seed";

export async function GET(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;
  try {
    if (hasServiceSupabase()) {
      return NextResponse.json({
        categories: await adminListCategories(),
        source: "supabase",
      });
    }
    return NextResponse.json({
      categories: getRuntimeCategories(),
      source: "memory",
    });
  } catch (e) {
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
  const nameUk = String(body.nameUk || "").trim();
  if (!nameUk) {
    return NextResponse.json(
      { error: "Назва (УКР) обов'язкова" },
      { status: 400 }
    );
  }
  const cat: Category = {
    id: body.id || `cat-${Date.now()}`,
    slug: body.slug || slugify(nameUk),
    nameUk,
    nameRu: String(body.nameRu || nameUk).trim(),
    descriptionUk: body.descriptionUk || null,
    descriptionRu: body.descriptionRu || null,
    parentId: body.parentId || null,
    sortOrder: Number(body.sortOrder ?? 0),
  };
  try {
    if (hasServiceSupabase()) {
      const saved = await adminUpsertCategory(cat, true);
      return NextResponse.json({ category: saved, source: "supabase" });
    }
    upsertRuntimeCategory(cat);
    return NextResponse.json({ category: cat, source: "memory" });
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
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  try {
    if (hasServiceSupabase()) {
      const cats = await adminListCategories();
      const existing = cats.find((c) => c.id === body.id);
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
      const saved = await adminUpsertCategory(cat, false);
      return NextResponse.json({ category: saved, source: "supabase" });
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
        body.sortOrder != null ? Number(body.sortOrder) : existing.sortOrder,
    };
    upsertRuntimeCategory(cat);
    return NextResponse.json({ category: cat, source: "memory" });
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
      await adminDeleteCategory(id);
      return NextResponse.json({ ok: true, source: "supabase" });
    }
    deleteRuntimeCategory(id);
    return NextResponse.json({ ok: true, source: "memory" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
