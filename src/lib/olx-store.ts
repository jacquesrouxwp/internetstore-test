/**
 * Server side of the OLX terminal: the owner's model price list and the
 * buying prices worked out for each deal from it.
 */

import type { createServiceClient } from "@/lib/supabase/service";
import { OLX_TIERS, buyPrices, matchModel, type OlxDeal, type OlxModel, type OlxTier, type OlxTierKey, type TerminalDeal } from "@/lib/olx-terminal";

export type { TerminalDeal };

type Sb = ReturnType<typeof createServiceClient>;

/** The whole price list — a few hundred rows at most. Empty if the table is not there yet. */
export async function loadModels(sb: Sb): Promise<OlxModel[]> {
  const { data, error } = await sb.from("olx_models").select("*").order("name");
  if (error) return [];
  return (data ?? []) as OlxModel[];
}

export function modelFor(d: Pick<OlxDeal, "model_id" | "product_slug" | "model" | "title">, models: OlxModel[]): OlxModel | null {
  if (d.model_id) return models.find((m) => m.id === d.model_id) ?? null;
  if (d.product_slug) {
    const bySlug = models.find((m) => m.product_slug === d.product_slug);
    if (bySlug) return bySlug;
  }
  return matchModel(d.model || d.title, models);
}

export function withPrices(deals: OlxDeal[], models: OlxModel[]): TerminalDeal[] {
  return deals.map((d) => ({ ...d, buy: buyPrices(modelFor(d, models), d) }));
}

const int = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.round(Number(String(v).replace(/[^\d.]/g, "")));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** A model's price list from the admin: { name, product_slug?, brand?, category?, aliases, tiers, notes }. */
export function parseModelInput(body: Record<string, unknown>): Partial<OlxModel> | { error: string } | null {
  const name = String(body.name ?? "").trim().slice(0, 300);
  if (!name) return null;
  const aliasesRaw = Array.isArray(body.aliases) ? body.aliases : String(body.aliases ?? "").split(",");
  const raw = (body.tiers ?? {}) as Record<string, Record<string, unknown>>;
  const tiers: Partial<Record<OlxTierKey, OlxTier>> = {};
  for (const { key, label } of OLX_TIERS) {
    const t = raw[key];
    if (!t) continue;
    const from = int(t.from);
    const to = int(t.to);
    if (!from && !to) continue;
    if (from && to && from > to) return { error: `${label}: «від» більше за «до»` };
    tiers[key] = { from: from ?? to, to: to ?? from, needs_ok: t.needs_ok === true };
  }
  const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max) || null;
  return {
    name,
    product_slug: text(body.product_slug, 200),
    brand: text(body.brand, 80),
    category: text(body.category, 80),
    aliases: aliasesRaw.map((x) => String(x).trim()).filter(Boolean).slice(0, 20),
    tiers,
    notes: text(body.notes, 2000),
  };
}
