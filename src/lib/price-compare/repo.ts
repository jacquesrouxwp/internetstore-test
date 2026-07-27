import {
  createServiceClient,
  hasServiceSupabase,
} from "@/lib/supabase/service";
import { extractPriceFromUrl } from "@/lib/price-compare/extract-price";
import {
  MAX_COMPETITORS,
  MIN_SAVINGS_UAH,
  STALE_DAYS,
  type Competitor,
  type CompetitorProductLink,
  type PriceCompareSummary,
} from "@/lib/price-compare/types";

function mapCompetitor(r: Record<string, unknown>): Competitor {
  return {
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    website: (r.website as string) || null,
    sortOrder: Number(r.sort_order ?? 0),
    isActive: r.is_active !== false,
  };
}

function mapLink(r: Record<string, unknown>): CompetitorProductLink {
  const comp = r.competitors as { name?: string } | null;
  return {
    id: String(r.id),
    productId: String(r.product_id),
    competitorId: String(r.competitor_id),
    competitorName: comp?.name,
    productUrl: String(r.product_url),
    lastPrice: r.last_price != null ? Number(r.last_price) : null,
    lastCheckedAt: (r.last_checked_at as string) || null,
    lastError: (r.last_error as string) || null,
    isActive: r.is_active !== false,
  };
}

function isStale(checkedAt: string | null): boolean {
  if (!checkedAt) return true;
  const t = new Date(checkedAt).getTime();
  if (!Number.isFinite(t)) return true;
  return Date.now() - t > STALE_DAYS * 24 * 60 * 60 * 1000;
}

export function buildPriceCompare(
  ourPrice: number,
  links: CompetitorProductLink[]
): PriceCompareSummary | null {
  const lines = links
    .filter(
      (l) =>
        l.isActive &&
        l.lastPrice != null &&
        Number.isFinite(l.lastPrice) &&
        l.lastPrice > 0
    )
    .map((l) => {
      const competitorPrice = l.lastPrice as number;
      return {
        competitorId: l.competitorId,
        competitorName: l.competitorName || "Конкурент",
        competitorPrice,
        ourPrice,
        savingUah: Math.round(competitorPrice - ourPrice),
        url: l.productUrl,
        checkedAt: l.lastCheckedAt,
        isStale: isStale(l.lastCheckedAt),
      };
    })
    .sort((a, b) => b.savingUah - a.savingUah);

  if (!lines.length) return null;

  const cheaper = lines.filter((l) => l.savingUah >= MIN_SAVINGS_UAH);
  const best = cheaper[0] || lines[0];

  return {
    ourPrice,
    bestSavingUah: best.savingUah,
    bestCompetitorName: best.competitorName,
    bestCompetitorPrice: best.competitorPrice,
    checkedAt: best.checkedAt,
    isStale: lines.some((l) => l.isStale),
    lines,
  };
}

export async function listCompetitors(): Promise<Competitor[]> {
  if (!hasServiceSupabase()) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("competitors")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return (data || []).map((r) => mapCompetitor(r as Record<string, unknown>));
}

export async function upsertCompetitor(
  input: Partial<Competitor> & { name: string; slug: string }
): Promise<Competitor> {
  if (!hasServiceSupabase()) throw new Error("Supabase not configured");
  const supabase = createServiceClient();
  const row = {
    ...(input.id ? { id: input.id } : {}),
    slug: input.slug,
    name: input.name,
    website: input.website ?? null,
    sort_order: input.sortOrder ?? 0,
    is_active: input.isActive !== false,
  };
  const { data, error } = await supabase
    .from("competitors")
    .upsert(row, { onConflict: "slug" })
    .select("*")
    .single();
  if (error) throw error;
  return mapCompetitor(data as Record<string, unknown>);
}

export async function listLinksForProduct(
  productId: string
): Promise<CompetitorProductLink[]> {
  if (!hasServiceSupabase()) return [];
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("competitor_product_links")
    .select("*, competitors(name)")
    .eq("product_id", productId);
  if (error) throw error;
  return (data || []).map((r) => mapLink(r as Record<string, unknown>));
}

export async function upsertProductLink(input: {
  productId: string;
  competitorId: string;
  productUrl: string;
  isActive?: boolean;
}): Promise<CompetitorProductLink> {
  if (!hasServiceSupabase()) throw new Error("Supabase not configured");
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("competitor_product_links")
    .upsert(
      {
        product_id: input.productId,
        competitor_id: input.competitorId,
        product_url: input.productUrl.trim(),
        is_active: input.isActive !== false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id,competitor_id" }
    )
    .select("*, competitors(name)")
    .single();
  if (error) throw error;
  return mapLink(data as Record<string, unknown>);
}

export async function deleteProductLink(id: string): Promise<void> {
  if (!hasServiceSupabase()) throw new Error("Supabase not configured");
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("competitor_product_links")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/** Load price compare map for many product ids */
export async function getPriceCompareMap(
  productIds: string[],
  pricesById: Record<string, number>
): Promise<Record<string, PriceCompareSummary>> {
  if (!hasServiceSupabase() || !productIds.length) return {};
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("competitor_product_links")
    .select("*, competitors(name)")
    .in("product_id", productIds)
    .eq("is_active", true);
  if (error || !data?.length) return {};

  const byProduct = new Map<string, CompetitorProductLink[]>();
  for (const row of data) {
    const link = mapLink(row as Record<string, unknown>);
    const arr = byProduct.get(link.productId) || [];
    arr.push(link);
    byProduct.set(link.productId, arr);
  }

  const out: Record<string, PriceCompareSummary> = {};
  byProduct.forEach((links, pid) => {
    const our = pricesById[pid];
    if (our == null) return;
    const summary = buildPriceCompare(our, links);
    if (summary) out[pid] = summary;
  });
  return out;
}

export async function syncLinkPrice(linkId: string): Promise<{
  ok: boolean;
  price?: number;
  error?: string;
}> {
  if (!hasServiceSupabase()) {
    return { ok: false, error: "Supabase not configured" };
  }
  const supabase = createServiceClient();
  const { data: link, error } = await supabase
    .from("competitor_product_links")
    .select("*")
    .eq("id", linkId)
    .maybeSingle();
  if (error || !link) return { ok: false, error: "Link not found" };

  const result = await extractPriceFromUrl(String(link.product_url));
  const now = new Date().toISOString();

  if (!result.ok) {
    await supabase
      .from("competitor_product_links")
      .update({
        last_error: result.error,
        last_checked_at: now,
        updated_at: now,
      })
      .eq("id", linkId);
    return { ok: false, error: result.error };
  }

  await supabase
    .from("competitor_product_links")
    .update({
      last_price: result.price,
      last_error: null,
      last_checked_at: now,
      updated_at: now,
    })
    .eq("id", linkId);

  return { ok: true, price: result.price };
}

/** Sync all active links (or one product). Respects MAX_COMPETITORS active. */
export async function syncAllPrices(opts?: {
  productId?: string;
  limit?: number;
}): Promise<{
  total: number;
  ok: number;
  failed: number;
  details: { id: string; ok: boolean; price?: number; error?: string }[];
}> {
  if (!hasServiceSupabase()) {
    return { total: 0, ok: 0, failed: 0, details: [] };
  }
  const supabase = createServiceClient();
  let q = supabase
    .from("competitor_product_links")
    .select("id")
    .eq("is_active", true);
  if (opts?.productId) q = q.eq("product_id", opts.productId);
  if (opts?.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw error;

  const details: {
    id: string;
    ok: boolean;
    price?: number;
    error?: string;
  }[] = [];
  let ok = 0;
  let failed = 0;

  for (const row of data || []) {
    const r = await syncLinkPrice(String(row.id));
    details.push({ id: String(row.id), ...r });
    if (r.ok) ok++;
    else failed++;
    // small delay to be polite
    await new Promise((r) => setTimeout(r, 400));
  }

  return { total: details.length, ok, failed, details };
}

export async function ensureThreeCompetitors(): Promise<Competitor[]> {
  const list = await listCompetitors();
  if (list.length >= MAX_COMPETITORS) return list.slice(0, MAX_COMPETITORS);
  // try seed if empty
  if (hasServiceSupabase()) {
    const supabase = createServiceClient();
    await supabase.from("competitors").upsert(
      [
        {
          slug: "opticstore",
          name: "OpticStore",
          website: "https://opticstore.com.ua/catalog/teplovizory",
          sort_order: 1,
          is_active: true,
        },
        {
          slug: "profoptica",
          name: "ProfOptica",
          website: "https://profoptica.com.ua/teplovizory/",
          sort_order: 2,
          is_active: true,
        },
        {
          slug: "optics-pro",
          name: "Optics-Pro",
          website: "https://www.optics-pro.com.ua/ua/teplovizori/",
          sort_order: 3,
          is_active: true,
        },
      ],
      { onConflict: "slug" }
    );
    return listCompetitors();
  }
  return list;
}
