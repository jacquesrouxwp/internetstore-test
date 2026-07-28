import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { hasServiceSupabase } from "@/lib/supabase/service";
import { slugify } from "@/lib/utils";
import {
  adminDeletePost,
  adminGetPost,
  adminListPosts,
  adminUpsertPost,
} from "@/lib/blog/repo";

export async function GET(req: NextRequest) {
  const denied = requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) {
    return NextResponse.json(
      { error: "Supabase not configured", posts: [] },
      { status: 503 }
    );
  }
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (id) {
      const post = await adminGetPost(id);
      if (!post)
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ post });
    }
    const posts = await adminListPosts();
    return NextResponse.json({ posts });
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
  if (!hasServiceSupabase()) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }
  try {
    const body = await req.json();
    const titleUk = String(body.titleUk || "").trim();
    if (!titleUk) {
      return NextResponse.json(
        { error: "titleUk required" },
        { status: 400 }
      );
    }
    const slug =
      String(body.slug || "").trim() ||
      slugify(titleUk).slice(0, 80) ||
      `post-${Date.now()}`;

    const post = await adminUpsertPost(
      {
        slug,
        titleUk,
        titleRu: String(body.titleRu || titleUk),
        excerptUk: body.excerptUk ?? null,
        excerptRu: body.excerptRu ?? null,
        bodyUk: body.bodyUk ?? null,
        bodyRu: body.bodyRu ?? null,
        coverUrl: body.coverUrl ?? null,
        category: body.category ?? null,
        published: body.published !== false,
        publishedAt: body.publishedAt || new Date().toISOString(),
        metaTitleUk: body.metaTitleUk ?? null,
        metaTitleRu: body.metaTitleRu ?? null,
        metaDescriptionUk: body.metaDescriptionUk ?? null,
        metaDescriptionRu: body.metaDescriptionRu ?? null,
      },
      true
    );
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
    const titleUk = String(body.titleUk ?? existing.titleUk).trim();
    const slug =
      String(body.slug || existing.slug).trim() || existing.slug;

    const post = await adminUpsertPost(
      {
        id,
        slug,
        titleUk,
        titleRu: String(body.titleRu ?? existing.titleRu),
        excerptUk:
          body.excerptUk !== undefined ? body.excerptUk : existing.excerptUk,
        excerptRu:
          body.excerptRu !== undefined ? body.excerptRu : existing.excerptRu,
        bodyUk: body.bodyUk !== undefined ? body.bodyUk : existing.bodyUk,
        bodyRu: body.bodyRu !== undefined ? body.bodyRu : existing.bodyRu,
        coverUrl:
          body.coverUrl !== undefined ? body.coverUrl : existing.coverUrl,
        category:
          body.category !== undefined ? body.category : existing.category,
        published:
          body.published !== undefined
            ? Boolean(body.published)
            : existing.published,
        publishedAt:
          body.publishedAt ||
          existing.publishedAt ||
          new Date().toISOString(),
        metaTitleUk:
          body.metaTitleUk !== undefined
            ? body.metaTitleUk
            : existing.metaTitleUk,
        metaTitleRu:
          body.metaTitleRu !== undefined
            ? body.metaTitleRu
            : existing.metaTitleRu,
        metaDescriptionUk:
          body.metaDescriptionUk !== undefined
            ? body.metaDescriptionUk
            : existing.metaDescriptionUk,
        metaDescriptionRu:
          body.metaDescriptionRu !== undefined
            ? body.metaDescriptionRu
            : existing.metaDescriptionRu,
      },
      false
    );
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
