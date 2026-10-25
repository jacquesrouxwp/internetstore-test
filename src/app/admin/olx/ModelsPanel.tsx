"use client";

import { useEffect, useMemo, useState } from "react";
import { OLX_TIERS, type CatalogItem, type OlxModel, type OlxTierKey, type TerminalDeal } from "@/lib/olx-terminal";

/**
 * The owner's price list for buying used: our catalogue by brand and
 * category, and for each model a range per state of the item — the bot opens
 * at "від", goes no higher than "до", and with "наш ОК" ticked waits for the
 * owner instead of buying by itself.
 */

type TierDraft = { from: string; to: string; needs_ok: boolean };
type Draft = { tiers: Record<OlxTierKey, TierDraft>; aliases: string; notes: string };

const money = (n: number | null | undefined) => (n ? new Intl.NumberFormat("uk-UA").format(n) : "—");
const blankTiers = () => Object.fromEntries(OLX_TIERS.map((t) => [t.key, { from: "", to: "", needs_ok: false }])) as Record<OlxTierKey, TierDraft>;
const toDraft = (m: OlxModel | undefined): Draft => {
  const tiers = blankTiers();
  for (const t of OLX_TIERS) {
    const v = m?.tiers?.[t.key];
    if (v) tiers[t.key] = { from: v.from ? String(v.from) : "", to: v.to ? String(v.to) : "", needs_ok: v.needs_ok };
  }
  return { tiers, aliases: (m?.aliases || []).join(", "), notes: m?.notes || "" };
};
const pricedStates = (m: OlxModel | undefined) => (m ? OLX_TIERS.filter((t) => m.tiers?.[t.key]?.to).length : 0);

/** One model's ranges per state. */
function PriceEditor({
  model,
  base,
  onSaved,
}: {
  model: OlxModel | undefined;
  base: { name: string; product_slug: string | null; brand: string | null; category: string | null };
  onSaved: () => Promise<void>;
}) {
  const [d, setD] = useState<Draft>(() => toDraft(model));
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const setTier = (k: OlxTierKey, patch: Partial<TierDraft>) => setD({ ...d, tiers: { ...d.tiers, [k]: { ...d.tiers[k], ...patch } } });

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/olx/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: model?.id, ...base, aliases: d.aliases, notes: d.notes, tiers: d.tiers }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(j.error || "Не вдалося зберегти");
        return;
      }
      setMsg("Збережено");
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!model || !window.confirm(`Прибрати всі ціни викупу для «${base.name}»?`)) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/olx/models?id=${encodeURIComponent(model.id)}`, { method: "DELETE" });
      await onSaved();
    } finally {
      setBusy(false);
    }
  };

  const digits = (v: string) => v.replace(/[^\d]/g, "");
  return (
    <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <table className="w-full max-w-2xl text-sm">
        <thead className="text-left text-xs text-zinc-500">
          <tr>
            <th className="py-1 font-medium">Стан</th>
            <th className="py-1 font-medium">Від, грн <span className="font-normal text-zinc-400">бот починає</span></th>
            <th className="py-1 font-medium">До, грн <span className="font-normal text-zinc-400">максимум</span></th>
            <th className="py-1 text-center font-medium" title="Без галочки бот купує сам і надсилає адресу відправки">Наш ОК</th>
          </tr>
        </thead>
        <tbody>
          {OLX_TIERS.map((t) => {
            const v = d.tiers[t.key];
            return (
              <tr key={t.key}>
                <td className="py-1 pr-2 text-zinc-800">{t.label}</td>
                <td className="py-1 pr-2">
                  <input inputMode="numeric" value={v.from} onChange={(e) => setTier(t.key, { from: digits(e.target.value) })} className="w-28 rounded border border-zinc-300 px-2 py-1 text-right tabular-nums" />
                </td>
                <td className="py-1 pr-2">
                  <input inputMode="numeric" value={v.to} onChange={(e) => setTier(t.key, { to: digits(e.target.value) })} className="w-28 rounded border border-zinc-300 px-2 py-1 text-right tabular-nums" />
                </td>
                <td className="py-1 text-center">
                  <input type="checkbox" checked={v.needs_ok} onChange={(e) => setTier(t.key, { needs_ok: e.target.checked })} className="h-4 w-4 accent-amber-500" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1 text-[11px] text-zinc-500">
        Порожній стан — у такому стані не купуємо (рішення за вами). Без галочки «Наш ОК» бот у межах «до» купує сам і надсилає адресу відправки.
        Дефект — завжди ваше рішення.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-zinc-500">
          Інші написання моделі (через кому)
          <input value={d.aliases} onChange={(e) => setD({ ...d, aliases: e.target.value })} className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900" />
        </label>
        <label className="text-xs text-zinc-500">
          Нотатки для бота
          <input value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} placeholder="напр. перевірити биті пікселі" className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900" />
        </label>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button type="button" disabled={busy} onClick={() => void save()} className="rounded bg-zinc-900 px-3 py-1 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-40">
          Зберегти
        </button>
        {model ? (
          <button type="button" disabled={busy} onClick={() => void remove()} className="text-xs text-red-600 hover:underline">
            Прибрати ціни
          </button>
        ) : null}
        {msg ? <span className="text-xs text-zinc-600">{msg}</span> : null}
      </div>
    </div>
  );
}

/** "нове 30–35к ✓ · 8/10 18–22к" — a short line of what is priced. */
function Summary({ m }: { m: OlxModel | undefined }) {
  if (!m || !pricedStates(m)) return <span className="text-xs text-zinc-400">цін немає</span>;
  const k = (n: number | null) => (n ? `${Math.round(n / 100) / 10}к` : "?");
  return (
    <span className="flex flex-wrap gap-1">
      {OLX_TIERS.filter((t) => m.tiers?.[t.key]?.to).map((t) => {
        const v = m.tiers[t.key]!;
        return (
          <span key={t.key} className={`rounded px-1.5 py-0.5 text-[11px] ${v.needs_ok ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-900"}`}>
            {t.key === "new_full" ? "нове" : t.key === "new_bare" ? "нове б/к" : t.label} {k(v.from)}–{k(v.to)}
            {v.needs_ok ? " · ок" : ""}
          </span>
        );
      })}
    </span>
  );
}

export function ModelsPanel({ models, deals, reload }: { models: OlxModel[]; deals: TerminalDeal[]; reload: () => Promise<void> }) {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [q, setQ] = useState("");
  const [onlyPriced, setOnlyPriced] = useState(false);
  const [openBrand, setOpenBrand] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [custom, setCustom] = useState("");

  useEffect(() => {
    void fetch("/api/admin/olx/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCatalog(d.items ?? []))
      .catch(() => {});
  }, []);

  const bySlug = useMemo(() => new Map(models.filter((m) => m.product_slug).map((m) => [m.product_slug!, m])), [models]);
  const ownModels = models.filter((m) => !m.product_slug);

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return catalog.filter(
      (c) =>
        (!onlyPriced || pricedStates(bySlug.get(c.slug)) > 0) &&
        words.every((w) => `${c.name} ${c.brand} ${c.category}`.toLowerCase().includes(w)),
    );
  }, [catalog, q, onlyPriced, bySlug]);

  // Brand → category → products, brands with more products first
  const tree = useMemo(() => {
    const brands = new Map<string, Map<string, CatalogItem[]>>();
    for (const c of shown) {
      if (!brands.has(c.brand)) brands.set(c.brand, new Map());
      const cats = brands.get(c.brand)!;
      if (!cats.has(c.category)) cats.set(c.category, []);
      cats.get(c.category)!.push(c);
    }
    return Array.from(brands.entries())
      .map(([brand, cats]) => ({ brand, cats: Array.from(cats.entries()), n: Array.from(cats.values()).reduce((s, l) => s + l.length, 0) }))
      .sort((a, b) => b.n - a.n);
  }, [shown]);

  // Models the bots found that have no price yet
  const unpriced = useMemo(() => {
    const c = new Map<string, number>();
    for (const d of deals) {
      if (d.buy || !(d.model || d.title)) continue;
      const name = (d.model || d.title)!;
      c.set(name, (c.get(name) ?? 0) + 1);
    }
    return Array.from(c.entries()).sort((a, b) => b[1] - a[1]);
  }, [deals]);

  const searching = q.trim().length > 0;
  const row = (c: CatalogItem) => {
    const m = bySlug.get(c.slug);
    const open = openItem === c.slug;
    return (
      <div key={c.slug} className="border-t border-zinc-100 py-1.5">
        <button type="button" onClick={() => setOpenItem(open ? null : c.slug)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-left">
          <span className="w-3 text-zinc-400">{open ? "▴" : "▾"}</span>
          <span className="min-w-[240px] flex-1 text-sm text-zinc-900">{c.name}</span>
          <span className="text-xs tabular-nums text-zinc-400">новий у нас {money(c.price)}</span>
          <Summary m={m} />
        </button>
        {open ? (
          <PriceEditor key={m?.updated_at ?? c.slug} model={m} base={{ name: c.name, product_slug: c.slug, brand: c.brand, category: c.category }} onSaved={reload} />
        ) : null}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
        <p>
          Наш каталог по брендах і категоріях. Для моделі задаєте ціни викупу <b>за станом</b>: нове з коробкою і документами, нове без них, 9/10, 8/10…
          Для кожного стану — <b>від</b> (з цієї ціни бот починає) і <b>до</b> (більше не дає). Галочка <b>«Наш ОК»</b> — бот чекає вашого рішення;
          без галочки купує сам і надсилає адресу відправки.
        </p>
        {unpriced.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-amber-700">Боти знайшли, а цін ще немає — натисніть, щоб знайти в каталозі:</span>
            {unpriced.map(([name, n]) => (
              <button
                key={name}
                type="button"
                onClick={() => setQ(name.replace(/hikmicro|infiray|pulsar|guide|agm|atn/gi, "").trim())}
                className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-900 hover:bg-amber-100"
              >
                {name}
                {n > 1 ? ` ×${n}` : ""}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Пошук моделі: TH35, Axion, PVS-14…" className="w-80 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm" />
        <label className="flex items-center gap-1.5 text-sm text-zinc-600">
          <input type="checkbox" checked={onlyPriced} onChange={(e) => setOnlyPriced(e.target.checked)} />
          тільки з цінами ({models.filter((m) => pricedStates(m) > 0).length})
        </label>
        <span className="text-xs text-zinc-400">{catalog.length ? `${shown.length} з ${catalog.length} товарів` : "завантажую каталог…"}</span>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white">
        {tree.map(({ brand, cats, n }) => {
          const open = searching || onlyPriced || openBrand === brand;
          const priced = cats.reduce((s, [, l]) => s + l.filter((c) => pricedStates(bySlug.get(c.slug)) > 0).length, 0);
          return (
            <div key={brand} className="border-b border-zinc-100 last:border-0">
              <button type="button" onClick={() => setOpenBrand(openBrand === brand ? null : brand)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-50">
                <span className="w-3 text-zinc-400">{open ? "▴" : "▾"}</span>
                <span className="font-semibold text-zinc-900">{brand}</span>
                <span className="text-xs text-zinc-500">{n} моделей</span>
                {priced ? <span className="rounded-full bg-emerald-100 px-2 text-[11px] text-emerald-900">з цінами: {priced}</span> : null}
              </button>
              {open ? (
                <div className="px-4 pb-3">
                  {cats.map(([cat, items]) => (
                    <div key={cat} className="mt-2">
                      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        {cat} · {items.length}
                      </div>
                      {(searching ? items.slice(0, 40) : items).map(row)}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        {catalog.length && !tree.length ? <p className="px-4 py-6 text-center text-sm text-zinc-400">Нічого не знайдено</p> : null}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="text-sm font-semibold text-zinc-900">Моделі не з нашого каталогу</div>
        <p className="mt-0.5 text-xs text-zinc-500">Якщо скуповуємо те, чого в магазині немає.</p>
        <div className="mt-2 flex gap-2">
          <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Назва моделі" className="w-80 rounded border border-zinc-300 px-2 py-1 text-sm" />
          <button
            type="button"
            disabled={!custom.trim()}
            onClick={async () => {
              await fetch("/api/admin/olx/models", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: custom.trim(), tiers: {} }),
              });
              setCustom("");
              await reload();
            }}
            className="rounded bg-zinc-900 px-3 py-1 text-sm font-semibold text-white disabled:opacity-40"
          >
            Додати
          </button>
        </div>
        {ownModels.map((m) => (
          <div key={m.id} className="border-t border-zinc-100 py-1.5">
            <button type="button" onClick={() => setOpenItem(openItem === m.id ? null : m.id)} className="flex w-full flex-wrap items-center gap-3 text-left">
              <span className="w-3 text-zinc-400">{openItem === m.id ? "▴" : "▾"}</span>
              <span className="flex-1 text-sm text-zinc-900">{m.name}</span>
              <Summary m={m} />
            </button>
            {openItem === m.id ? (
              <PriceEditor key={m.updated_at} model={m} base={{ name: m.name, product_slug: null, brand: m.brand, category: m.category }} onSaved={reload} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
