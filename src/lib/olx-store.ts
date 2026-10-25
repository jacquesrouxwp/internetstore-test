/**
 * Server side of the OLX terminal: the owner's model price list and the
 * buying prices worked out for each deal from it.
 */

import type { createServiceClient } from "@/lib/supabase/service";
import { buyPrices, matchModel, type OlxAdjust, type OlxDeal, type OlxModel, type TerminalDeal } from "@/lib/olx-terminal";

export type { TerminalDeal };

type Sb = ReturnType<typeof createServiceClient>;

/** The whole price list — a few hundred rows at most. Empty if the table is not there yet. */
export async function loadModels(sb: Sb): Promise<OlxModel[]> {
  const { data, error } = await sb.from("olx_models").select("*").order("name");
  if (error) return [];
  return (data ?? []) as OlxModel[];
}

export function modelFor(d: Pick<OlxDeal, "model_id" | "model" | "title">, models: OlxModel[]): OlxModel | null {
  if (d.model_id) return models.find((m) => m.id === d.model_id) ?? null;
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

/** A model row from the admin form: { name, aliases, category, target_price, ceiling_price, adjust, notes }. */
export function parseModelInput(body: Record<string, unknown>): Partial<OlxModel> | null {
  const name = String(body.name ?? "").trim().slice(0, 200);
  if (!name) return null;
  const aliasesRaw = Array.isArray(body.aliases) ? body.aliases : String(body.aliases ?? "").split(",");
  const a = (body.adjust ?? {}) as Record<string, unknown>;
  const adjust: OlxAdjust = {};
  for (const k of ["new", "used", "no_box", "no_docs"] as const) {
    const v = int(a[k]);
    if (v) adjust[k] = v;
  }
  return {
    name,
    aliases: aliasesRaw.map((x) => String(x).trim()).filter(Boolean).slice(0, 20),
    category: String(body.category ?? "").trim().slice(0, 80) || null,
    target_price: int(body.target_price),
    ceiling_price: int(body.ceiling_price),
    adjust,
    notes: String(body.notes ?? "").trim().slice(0, 2000) || null,
  };
}
