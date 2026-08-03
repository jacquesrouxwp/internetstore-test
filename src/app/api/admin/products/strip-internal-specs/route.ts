import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  createServiceClient,
  hasServiceSupabase,
} from "@/lib/supabase/service";
import { isInternalSpecKey } from "@/lib/product-specs";

/**
 * POST /api/admin/products/strip-internal-specs
 *
 * One-off cleanup: the optics-pro import used to stash bookkeeping keys
 * (_sourceSite, _sourceUrl, _importedAt, _rewriteNeeded, _imagesFlagged)
 * inside `specs`, which is rendered verbatim in the public characteristics
 * table -- so the donor URL was visible to shoppers. The importer no longer
 * writes them; this removes the ones already stored.
 *
 * body: { dryRun?: boolean, limit?: number }
 * Idempotent: re-running once clean reports changed: 0.
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
  const limit = Number(body.limit) > 0 ? Number(body.limit) : 400;

  const supabase = createServiceClient();
  const sample: { id: string; removed: string[] }[] = [];
  let scanned = 0;
  let changed = 0;
  let remaining = 0;

  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("id, specs")
      .range(from, from + pageSize - 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data?.length) break;
    scanned += data.length;

    for (const row of data) {
      const specs = (row.specs || {}) as Record<string, unknown>;
      const bad = Object.keys(specs).filter(isInternalSpecKey);
      if (!bad.length) continue;

      if (changed >= limit) {
        remaining++;
        continue;
      }

      if (sample.length < 5) sample.push({ id: String(row.id), removed: bad });

      if (!dryRun) {
        const cleaned: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(specs)) {
          if (!isInternalSpecKey(k)) cleaned[k] = v;
        }
        const { error: upErr } = await supabase
          .from("products")
          .update({ specs: cleaned, updated_at: new Date().toISOString() })
          .eq("id", row.id);
        if (upErr) {
          return NextResponse.json(
            { error: upErr.message, changedSoFar: changed },
            { status: 500 }
          );
        }
      }
      changed++;
    }

    if (data.length < pageSize) break;
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    scanned,
    changed,
    remaining,
    sample,
  });
}
