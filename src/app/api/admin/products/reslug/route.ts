import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { createServiceClient, hasServiceSupabase } from "@/lib/supabase/service";
import { slugify } from "@/lib/utils";

/**
 * Rewrite non-ASCII product slugs to their transliterated form.
 *
 * Needed because imported products were slugged straight from Ukrainian
 * names; those URLs 404 on the product route. Idempotent — rows that already
 * have an ASCII slug are left alone. POST { dryRun: true } to preview.
 */
export async function POST(req: NextRequest) {
  const denied = await requireAdminApi(req);
  if (denied) return denied;
  if (!hasServiceSupabase()) {
    return NextResponse.json(
      { error: "Supabase service role not configured" },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const dryRun = Boolean(body.dryRun);
  const supabase = createServiceClient();

  const all: { id: string; slug: string; name_uk: string }[] = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("id, slug, name_uk")
      .range(from, from + pageSize - 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    all.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  const taken = new Set(all.map((p) => p.slug));
  const changes: { id: string; from: string; to: string }[] = [];

  for (const p of all) {
    if (/^[a-z0-9-]+$/.test(p.slug)) continue;
    let next = slugify(p.slug) || slugify(p.name_uk);
    if (!next) continue;
    if (next !== p.slug && taken.has(next)) {
      let n = 2;
      while (taken.has(`${next}-${n}`)) n++;
      next = `${next}-${n}`;
    }
    taken.delete(p.slug);
    taken.add(next);
    changes.push({ id: p.id, from: p.slug, to: next });
  }

  if (!dryRun) {
    for (const c of changes) {
      const { error } = await supabase
        .from("products")
        .update({ slug: c.to, updated_at: new Date().toISOString() })
        .eq("id", c.id);
      if (error) {
        return NextResponse.json(
          { error: `${c.from}: ${error.message}`, appliedBefore: changes.indexOf(c) },
          { status: 500 }
        );
      }
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    scanned: all.length,
    changed: changes.length,
    sample: changes.slice(0, 10),
  });
}
