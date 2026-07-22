import { NextRequest, NextResponse } from "next/server";
import {
  deleteRuntimeBrand,
  getRuntimeBrands,
  upsertRuntimeBrand,
} from "@/data/seed";
import type { Brand } from "@/types";
import { slugify } from "@/lib/utils";
import { requireAdminApi } from "@/lib/admin/auth";

export async function GET(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;
  return NextResponse.json({ brands: getRuntimeBrands() });
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

  upsertRuntimeBrand(brand);
  return NextResponse.json({ brand });
}

export async function PUT(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const body = await req.json();
  if (!body.id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const existing = getRuntimeBrands().find((b) => b.id === body.id);
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

  upsertRuntimeBrand(brand);
  return NextResponse.json({ brand });
}

export async function DELETE(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  deleteRuntimeBrand(id);
  return NextResponse.json({ ok: true });
}
