import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { hasServiceSupabase } from "@/lib/supabase/service";
import { slugify } from "@/lib/utils";
import {
  adminDeletePost,
  adminGetPost,
  adminListCategories,
  adminListPosts,
  adminUpsertPost,
} from "@/lib/blog/repo";

export async function GET(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) {
    return NextResponse.json(
      { error: "Supabase not configured", posts: [], total: 0 },
      { status: 503 }
    );
  }
  try {
    const sp = req.nextUrl.searchParams;
    const id = sp.get("id");
    if (id) {
      const post = await adminGetPost(id);
      if (!post)
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ post });
    }
    const [list, categories] = await Promise.all([
      adminListPosts({
        q: sp.get("q") || undefined,
        category: sp.get("category") || undefined,
        status: (sp.get("status") as "all" | "published" | "draft") || "all",
        page: Number(sp.get("page") || 1),
        limit: Number(sp.get("limit") || 20),
      }),
      adminListCategories(),
    ]);
    return NextResponse.json({ ...list, categories });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}

function parseBody(body: Record<string, unknown>, existingSlug?: string) {
  const titleUk = String(body.titleUk || "").trim();
  if (!titleUk) throw new Error("titleUk required");
  const slug =
    String(body.slug || "").trim() ||
    existingSlug ||
    slugify(titleUk).slice(0, 80) ||
    `post-${Date.now()}`;
  const published = body.published === true;
  return {
    slug,
    titleUk,
    titleRu: String(body.titleRu || titleUk),
    excerptUk: (body.excerptUk as string) ?? null,
    excerptRu: (body.excerptRu as string) ?? null,
    bodyUk: (body.bodyUk as string) ?? null,
    bodyRu: (body.bodyRu as string) ?? null,
    coverUrl: (body.coverUrl as string) ?? null,
    category: (body.category as string) ?? null,
    published,
    publishedAt: body.publishedAt
      ? String(body.publishedAt)
      : published
        ? new Date().toISOString()
        : null,
    metaTitleUk: (body.metaTitleUk as string) ?? null,
    metaTitleRu: (body.metaTitleRu as string) ?? null,
    metaDescriptionUk: (body.metaDescriptionUk as string) ?? null,
    metaDescriptionRu: (body.metaDescriptionRu as string) ?? null,
  };
}

export async function POST(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }
  try {
    const body = await req.json();
    const parsed = parseBody(body);
    const post = await adminUpsertPost(parsed, true);
    return NextResponse.json({ post });
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
  if (!hasServiceSupabase()) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }
  try {
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const existing = await adminGetPost(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const parsed = parseBody(body, existing.slug);
    const post = await adminUpsertPost({ ...parsed, id }, false);
    return NextResponse.json({ post });
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
    await adminDeletePost(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
