import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  createServiceClient,
  hasServiceSupabase,
} from "@/lib/supabase/service";
import {
  sanitizeDonorDescription,
  hasCompetitorMention,
} from "@/lib/import/sanitize-description";

/**
 * POST /api/admin/products/sanitize-descriptions
 *
 * Descriptions copied from the donor carry that shop's own marketing --
 * "Магазин Optics-Pro є офіційним представником бренду ...", plus service
 * promises (pre-sale checks, own service centre, delivery terms) that are
 * not ours to make. On our storefront that reads as an advert for a
 * competitor. This strips those sentences and leaves the product text.
 *
 * body: { dryRun?: boolean, limit?: number }
 * Idempotent: a second run over clean rows reports changed: 0.
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
  const limit = Number(body.limit) > 0 ? Number(body.limit) : 250;
  // Descriptions run to several KB each, so pulling the whole catalogue in
  // one request timed out. Walk it a page at a time and let the caller drive.
  const offset = Number(body.offset) > 0 ? Number(body.offset) : 0;
  const pageSize = Number(body.pageSize) > 0 ? Number(body.pageSize) : 100;
  const onePage = body.onePage !== false;

  const supabase = createServiceClient();
  let scanned = 0;
  let changed = 0;
  let remaining = 0;
  let hadCompetitor = 0;
  let stillDirty = 0;
  let nextOffset: number | null = null;
  const sample: Record<string, unknown>[] = [];

  for (let from = offset; ; from += pageSize) {
    const { data, error } = await supabase
      .from("products")
      .select("id, slug, description_uk, description_ru")
      .order("id")
      .range(from, from + pageSize - 1);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    if (!data?.length) break;
    scanned += data.length;

    for (const row of data) {
      const uk = sanitizeDonorDescription(row.description_uk as string | null);
      const ru = sanitizeDonorDescription(row.description_ru as string | null);
      const ukChanged = uk.text !== (row.description_uk || "").trim();
      const ruChanged = ru.text !== (row.description_ru || "").trim();
      if (!ukChanged && !ruChanged) continue;

      if (uk.hadCompetitor || ru.hadCompetitor) hadCompetitor++;
      if (changed >= limit) {
        remaining++;
        continue;
      }

      if (sample.length < 3) {
        sample.push({
          slug: row.slug,
          before: (row.description_uk || "").length,
          after: uk.text.length,
          removed: uk.removedSentences.slice(0, 4),
        });
      }

      if (!dryRun) {
        const { error: upErr } = await supabase
          .from("products")
          .update({
            description_uk: uk.text || null,
            description_ru: ru.text || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id);
        if (upErr) {
          return NextResponse.json(
            { error: upErr.message, changedSoFar: changed },
            { status: 500 }
          );
        }
      }
      if (hasCompetitorMention(uk.text) || hasCompetitorMention(ru.text)) {
        stillDirty++;
      }
      changed++;
    }

    if (data.length < pageSize) break;
    if (onePage) {
      nextOffset = from + pageSize;
      break;
    }
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    scanned,
    changed,
    remaining,
    hadCompetitor,
    stillDirtyAfterSanitize: stillDirty,
    nextOffset,
    sample,
  });
}
