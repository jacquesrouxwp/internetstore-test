import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import {
  createServiceClient,
  hasServiceSupabase,
} from "@/lib/supabase/service";
import {
  fetchDonorHtml,
  parseProductPage,
} from "@/lib/import/optics-pro-scraper";
import {
  normalizeSpecs,
  resolutionString,
} from "@/lib/import/optics-pro-normalize";
import { isInternalSpecKey } from "@/lib/product-specs";

/**
 * POST /api/admin/products/enrich-from-donor
 *
 * Fills in the original demo products, which shipped with six generic specs
 * and a one-line description, using the real characteristics from an already
 * verified donor page. The caller supplies the pairing, so the risky part
 * (deciding that donor page X really is our product Y) stays out of here.
 *
 * Only description + specs + resolution/detection range are touched: price,
 * images, name, category and brand are left exactly as they are.
 *
 * body: { items: [{ slug, donorUrl }], dryRun?: boolean }
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
  const items: { slug: string; donorUrl: string }[] = Array.isArray(body.items)
    ? body.items
    : [];
  const dryRun = Boolean(body.dryRun);
  if (!items.length) {
    return NextResponse.json({ error: "items required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const results: Record<string, unknown>[] = [];

  for (const item of items) {
    try {
      const { data: rows, error } = await supabase
        .from("products")
        .select("id, slug, specs, description_uk, description_ru")
        .eq("slug", item.slug)
        .limit(1);
      if (error) throw new Error(error.message);
      const row = rows?.[0];
      if (!row) {
        results.push({ slug: item.slug, ok: false, reason: "not found" });
        continue;
      }

      const parsed = parseProductPage(
        await fetchDonorHtml(item.donorUrl),
        item.donorUrl
      );
      if (!parsed) {
        results.push({ slug: item.slug, ok: false, reason: "no product json-ld" });
        continue;
      }

      const n = normalizeSpecs(parsed.specPairs);
      const specs: Record<string, string> = {};
      // real characteristics, verbatim
      for (const [k, v] of Object.entries(n.raw)) {
        if (!isInternalSpecKey(k) && String(v).trim()) specs[k] = String(v);
      }
      // numeric fields the filters and scoring read
      const num: [string, number | undefined][] = [
        ["pixelPitchUm", n.pixelPitchUm],
        ["netdMk", n.netdMk],
        ["frequencyHz", n.frequencyHz],
        ["focalLengthMm", n.focalLengthMm],
        ["magnificationMin", n.magnificationMin],
        ["magnificationMax", n.magnificationMax],
        ["weightG", n.weightG],
        ["batteryLifeH", n.batteryLifeH],
        ["memoryGb", n.memoryGb],
        ["warrantyMonths", n.warrantyMonths],
      ];
      for (const [k, v] of num) if (v != null) specs[k] = String(v);
      for (const [k, v] of [
        ["display", n.display],
        ["displayResolution", n.displayResolution],
        ["ip", n.ip],
        ["dimensionsMm", n.dimensionsMm],
        ["batteryType", n.batteryType],
        ["batteryModel", n.batteryModel],
        ["operatingTempRange", n.operatingTempRange],
      ] as [string, string | undefined][]) {
        if (v) specs[k] = v;
      }

      const resolution = resolutionString(n.hPixels, n.vPixels);
      const description = parsed.descriptionRaw || null;

      const patch: Record<string, unknown> = {
        specs,
        updated_at: new Date().toISOString(),
      };
      if (description) {
        patch.description_uk = description;
        patch.description_ru = description;
      }
      if (resolution) patch.resolution = resolution;
      if (n.detectionRangeM != null) patch.detection_range_m = n.detectionRangeM;

      if (!dryRun) {
        const { error: upErr } = await supabase
          .from("products")
          .update(patch)
          .eq("id", row.id);
        if (upErr) throw new Error(upErr.message);
      }

      results.push({
        slug: item.slug,
        ok: true,
        donorName: parsed.name,
        specsBefore: Object.keys(row.specs || {}).length,
        specsAfter: Object.keys(specs).length,
        descBefore: (row.description_uk || "").length,
        descAfter: description ? description.length : 0,
        resolution,
        detectionRangeM: n.detectionRangeM ?? null,
      });
    } catch (e) {
      results.push({
        slug: item.slug,
        ok: false,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ ok: true, dryRun, count: results.length, results });
}
