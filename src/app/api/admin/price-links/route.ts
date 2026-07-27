import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { hasServiceSupabase } from "@/lib/supabase/service";
import {
  deleteProductLink,
  listLinksForProduct,
  upsertProductLink,
} from "@/lib/price-compare/repo";

export async function GET(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;
  const productId = req.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId required" }, { status: 400 });
  }
  if (!hasServiceSupabase()) {
    return NextResponse.json({ links: [], source: "none" });
  }
  try {
    const links = await listLinksForProduct(productId);
    return NextResponse.json({ links });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Error",
        hint: "Run migration 002_price_compare.sql",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  try {
    const body = await req.json();
    const productId = String(body.productId || "");
    const competitorId = String(body.competitorId || "");
    const productUrl = String(body.productUrl || "").trim();
    if (!productId || !competitorId || !productUrl) {
      return NextResponse.json(
        { error: "productId, competitorId, productUrl required" },
        { status: 400 }
      );
    }
    if (!/^https?:\/\//i.test(productUrl)) {
      return NextResponse.json(
        { error: "URL must start with http(s)://" },
        { status: 400 }
      );
    }
    const link = await upsertProductLink({
      productId,
      competitorId,
      productUrl,
      isActive: body.isActive !== false,
    });
    return NextResponse.json({ link });
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
    await deleteProductLink(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
