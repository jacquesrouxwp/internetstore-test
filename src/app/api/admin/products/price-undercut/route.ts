import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  createServiceClient,
  hasServiceSupabase,
} from "@/lib/supabase/service";
import { listLinksForProduct, syncLinkPrice } from "@/lib/price-compare/repo";

/**
 * POST /api/admin/products/price-undercut
 *
 * Re-reads each competitor's live price for the given products and sets ours
 * a fixed percentage below the cheapest of them, so the price-compare badge
 * can honestly say we are the cheapest.
 *
 * A product is skipped, never guessed at, when it has no competitor links or
 * none of them yielded a price -- setting a price off no data would be worse
 * than leaving it alone.
 *
 * body: { slugs: string[], percent?: number, sync?: boolean, dryRun?: boolean }
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
  const slugs: string[] = Array.isArray(body.slugs) ? body.slugs : [];
  const percent = Number.isFinite(Number(body.percent))
    ? Number(body.percent)
    : 10;
  const doSync = body.sync !== false;
  const dryRun = Boolean(body.dryRun);

  if (!slugs.length) {
    return NextResponse.json({ error: "slugs required" }, { status: 400 });
  }
  if (percent <= 0 || percent >= 90) {
    return NextResponse.json({ error: "percent out of range" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const results: Record<string, unknown>[] = [];

  for (const slug of slugs) {
    try {
      const { data: rows, error } = await supabase
        .from("products")
        .select("id, slug, name_uk, price")
        .eq("slug", slug)
        .limit(1);
      if (error) throw new Error(error.message);
      const p = rows?.[0];
      if (!p) {
        results.push({ slug, ok: false, reason: "товар не знайдено" });
        continue;
      }

      let links = await listLinksForProduct(String(p.id));
      if (!links.length) {
        results.push({
          slug,
          ok: false,
          reason: "немає посилань на конкурентів",
          ourPrice: Number(p.price),
        });
        continue;
      }

      if (doSync && !dryRun) {
        for (const l of links) {
          try {
            await syncLinkPrice(l.id);
          } catch {
            /* keep the previously stored price for this competitor */
          }
        }
        links = await listLinksForProduct(String(p.id));
      }

      const priced = links
        .filter((l) => l.isActive && l.lastPrice != null && l.lastPrice > 0)
        .map((l) => ({
          name: l.competitorName || "конкурент",
          price: Number(l.lastPrice),
          error: l.lastError,
        }));

      if (!priced.length) {
        results.push({
          slug,
          ok: false,
          reason: "жодна ціна конкурента не зчиталась",
          ourPrice: Number(p.price),
          errors: links.map((l) => l.lastError).filter(Boolean),
        });
        continue;
      }

      const cheapest = priced.reduce((a, b) => (b.price < a.price ? b : a));
      const target = Math.round((cheapest.price * (100 - percent)) / 100);
      const before = Number(p.price);

      if (!dryRun && target !== before) {
        const { error: upErr } = await supabase
          .from("products")
          .update({ price: target, updated_at: new Date().toISOString() })
          .eq("id", p.id);
        if (upErr) throw new Error(upErr.message);
      }

      results.push({
        slug,
        ok: true,
        name: p.name_uk,
        priceBefore: before,
        priceAfter: target,
        cheapestCompetitor: cheapest.name,
        cheapestCompetitorPrice: cheapest.price,
        competitors: priced.map((c) => `${c.name}: ${c.price}`),
        undercutUah: cheapest.price - target,
      });
    } catch (e) {
      results.push({
        slug,
        ok: false,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const applied = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    dryRun,
    percent,
    requested: slugs.length,
    applied,
    skipped: slugs.length - applied,
    results,
  });
}
