import {
  createServiceClient,
  hasServiceSupabase,
  hasPublicSupabase,
} from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import {
  mapDbPost,
  postToDbRow,
  type BlogPost,
} from "@/lib/blog/types";
import { isUuid } from "@/lib/supabase/mappers";

const TABLE = "blog_posts";

async function readClient() {
  if (hasServiceSupabase()) {
    try {
      return createServiceClient();
    } catch {
      /* */
    }
  }
  if (hasPublicSupabase()) {
    try {
      return await createClient();
    } catch {
      return null;
    }
  }
  return null;
}

export async function listPublishedPosts(opts?: {
  limit?: number;
  page?: number;
  category?: string;
}): Promise<{ posts: BlogPost[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, opts?.page || 1);
  const limit = Math.min(48, Math.max(1, opts?.limit || 12));
  const sb = await readClient();
  if (!sb) return { posts: [], total: 0, page, limit };

  let q = sb
    .from(TABLE)
    .select("*", { count: "exact" })
    .eq("published", true)
    .order("published_at", { ascending: false });

  if (opts?.category?.trim()) {
    q = q.eq("category", opts.category.trim());
  }

  const from = (page - 1) * limit;
  q = q.range(from, from + limit - 1);

  const { data, error, count } = await q;
  if (error) {
    console.error("[blog] list", error.message);
    return { posts: [], total: 0, page, limit };
  }
  return {
    posts: (data || []).map((r) => mapDbPost(r as Record<string, unknown>)),
    total: count ?? 0,
    page,
    limit,
  };
}

export async function getPublishedPostBySlug(
  slug: string
): Promise<BlogPost | null> {
  const sb = await readClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error || !data) return null;
  return mapDbPost(data as Record<string, unknown>);
}

export async function listRelatedPosts(
  post: BlogPost,
  limit = 3
): Promise<BlogPost[]> {
  const sb = await readClient();
  if (!sb) return [];
  let q = sb
    .from(TABLE)
    .select("*")
    .eq("published", true)
    .neq("id", post.id)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (post.category) q = q.eq("category", post.category);
  const { data } = await q;
  const posts = (data || []).map((r) =>
    mapDbPost(r as Record<string, unknown>)
  );
  if (posts.length < limit) {
    const { data: more } = await sb
      .from(TABLE)
      .select("*")
      .eq("published", true)
      .neq("id", post.id)
      .order("published_at", { ascending: false })
      .limit(limit);
    const ids = new Set(posts.map((p) => p.id));
    for (const r of more || []) {
      const p = mapDbPost(r as Record<string, unknown>);
      if (!ids.has(p.id)) {
        posts.push(p);
        ids.add(p.id);
      }
      if (posts.length >= limit) break;
    }
  }
  return posts.slice(0, limit);
}

export async function listPostCategories(): Promise<string[]> {
  const sb = await readClient();
  if (!sb) return [];
  const { data } = await sb
    .from(TABLE)
    .select("category")
    .eq("published", true)
    .not("category", "is", null);
  const set = new Set<string>();
  for (const r of data || []) {
    if (r.category) set.add(String(r.category));
  }
  return Array.from(set).sort();
}

export type AdminPostListParams = {
  q?: string;
  category?: string;
  status?: "all" | "published" | "draft";
  page?: number;
  limit?: number;
};

export async function adminListPosts(
  params: AdminPostListParams = {}
): Promise<{ posts: BlogPost[]; total: number; page: number; limit: number }> {
  if (!hasServiceSupabase()) throw new Error("Supabase not configured");
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 20));
  const sb = createServiceClient();

  let q = sb
    .from(TABLE)
    .select("*", { count: "exact" })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (params.status === "published") q = q.eq("published", true);
  if (params.status === "draft") q = q.eq("published", false);
  if (params.category?.trim()) q = q.eq("category", params.category.trim());
  if (params.q?.trim()) {
    const s = params.q.trim().replace(/%/g, "");
    q = q.or(
      `title_uk.ilike.%${s}%,title_ru.ilike.%${s}%,slug.ilike.%${s}%,category.ilike.%${s}%`
    );
  }

  const from = (page - 1) * limit;
  q = q.range(from, from + limit - 1);

  const { data, error, count } = await q;
  if (error) throw error;
  return {
    posts: (data || []).map((r) => mapDbPost(r as Record<string, unknown>)),
    total: count ?? 0,
    page,
    limit,
  };
}

export async function adminListCategories(): Promise<string[]> {
  if (!hasServiceSupabase()) return [];
  const sb = createServiceClient();
  const { data } = await sb
    .from(TABLE)
    .select("category")
    .not("category", "is", null);
  const set = new Set<string>();
  for (const r of data || []) {
    if (r.category) set.add(String(r.category));
  }
  return Array.from(set).sort();
}

export async function adminGetPost(id: string): Promise<BlogPost | null> {
  if (!hasServiceSupabase()) throw new Error("Supabase not configured");
  const sb = createServiceClient();
  const { data, error } = await sb
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return mapDbPost(data as Record<string, unknown>);
}

export async function adminUpsertPost(
  post: Partial<BlogPost> & { slug: string; titleUk: string; titleRu: string },
  isNew: boolean
): Promise<BlogPost> {
  if (!hasServiceSupabase()) throw new Error("Supabase not configured");
  const sb = createServiceClient();
  const row = postToDbRow(post);

  if (isNew || !post.id || !isUuid(post.id)) {
    const { data, error } = await sb
      .from(TABLE)
      .insert(row)
      .select("*")
      .single();
    if (error) throw error;
    return mapDbPost(data as Record<string, unknown>);
  }

  const { data, error } = await sb
    .from(TABLE)
    .update(row)
    .eq("id", post.id)
    .select("*")
    .single();
  if (error) throw error;
  return mapDbPost(data as Record<string, unknown>);
}

export async function adminDeletePost(id: string): Promise<void> {
  if (!hasServiceSupabase()) throw new Error("Supabase not configured");
  const sb = createServiceClient();
  const { error } = await sb.from(TABLE).delete().eq("id", id);
  if (error) throw error;
}
