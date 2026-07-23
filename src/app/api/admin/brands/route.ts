import { NextRequest, NextResponse } from "next/server";
import type { Brand } from "@/types";
import { slugify } from "@/lib/utils";
import { requireAdminApi } from "@/lib/admin/auth";
import { hasServiceSupabase } from "@/lib/supabase/service";
import {
  adminDeleteBrand,
  adminListBrands,
  adminUpsertBrand,
} from "@/lib/db/admin-repo";
import {
  deleteRuntimeBrand,
  getRuntimeBrands,
  upsertRuntimeBrand,
} from "@/data/seed";

export async function GET(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;
  try {
    if (hasServiceSupabase()) {
      return NextResponse.json({
        brands: await adminListBrands(),
        source: "supabase",
      });
    }
    return NextResponse.json({
      brands: getRuntimeBrands(),
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
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "Назва бренду обов'язкова" },
      { status: 400 }
    );
  }
  const brand: Brand = {
    id: body.id || `brand-${Date.now()}`,
    slug: body.slug || slugify(name),
    name,
    logoUrl: body.logoUrl || null,
  };
  try {
    if (hasServiceSupabase()) {
      const saved = await adminUpsertBrand(brand, true);
      return NextResponse.json({ brand: saved, source: "supabase" });
    }
    upsertRuntimeBrand(brand);
    return NextResponse.json({ brand, source: "memory" });
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
      const brands = await adminListBrands();
      const existing = brands.find((b) => b.id === body.id);
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const brand: Brand = {
        ...existing,
        name: body.name != null ? String(body.name) : existing.name,
        slug: body.slug || existing.slug,
        logoUrl:
          body.logoUrl !== undefined ? body.logoUrl : existing.logoUrl,
      };
      const saved = await adminUpsertBrand(brand, false);
      return NextResponse.json({ brand: saved, source: "supabase" });
    }
    const existing = getRuntimeBrands().find((b) => b.id === body.id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const brand: Brand = {
      ...existing,
      name: body.name != null ? String(body.name) : existing.name,
      slug: body.slug || existing.slug,
      logoUrl: body.logoUrl !== undefined ? body.logoUrl : existing.logoUrl,
    };
    upsertRuntimeBrand(brand);
    return NextResponse.json({ brand, source: "memory" });
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
      await adminDeleteBrand(id);
      return NextResponse.json({ ok: true, source: "supabase" });
    }
    deleteRuntimeBrand(id);
    return NextResponse.json({ ok: true, source: "memory" });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
