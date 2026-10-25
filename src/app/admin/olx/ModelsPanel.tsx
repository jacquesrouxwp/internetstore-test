"use client";

import { useMemo, useState } from "react";
import type { OlxModel, TerminalDeal } from "@/lib/olx-terminal";

/**
 * The owner's price list: per model the target (the bot buys at or under it)
 * and the ceiling (up to it the owner decides), for "як нове" with box and
 * documents, plus how much condition, box and documents move both.
 */

type Draft = {
  id?: string;
  name: string;
  aliases: string;
  category: string;
  target_price: string;
  ceiling_price: string;
  new: string;
  used: string;
  no_box: string;
  no_docs: string;
  notes: string;
};

const s = (n: number | null | undefined) => (n ? String(n) : "");
const toDraft = (m: OlxModel): Draft => ({
  id: m.id,
  name: m.name,
  aliases: (m.aliases || []).join(", "),
  category: m.category || "",
  target_price: s(m.target_price),
  ceiling_price: s(m.ceiling_price),
  new: s(m.adjust?.new),
  used: s(m.adjust?.used),
  no_box: s(m.adjust?.no_box),
  no_docs: s(m.adjust?.no_docs),
  notes: m.notes || "",
});
const empty = (name = ""): Draft => ({ name, aliases: "", category: "", target_price: "", ceiling_price: "", new: "", used: "", no_box: "", no_docs: "", notes: "" });

const COLS: { key: keyof Draft; label: string; hint: string; w: string; numeric?: boolean }[] = [
  { key: "name", label: "Модель", hint: "як її називають продавці", w: "min-w-[200px]" },
  { key: "aliases", label: "Інші написання", hint: "через кому", w: "min-w-[150px]" },
  { key: "category", label: "Категорія", hint: "", w: "w-28" },
  { key: "target_price", label: "Ціль", hint: "бот купує сам", w: "w-24", numeric: true },
  { key: "ceiling_price", label: "Стеля", hint: "до неї — ваш ок", w: "w-24", numeric: true },
  { key: "new", label: "+ нове", hint: "не користувались", w: "w-20", numeric: true },
  { key: "used", label: "− б/у", hint: "є сліди", w: "w-20", numeric: true },
  { key: "no_box", label: "− без коробки", hint: "", w: "w-20", numeric: true },
  { key: "no_docs", label: "− без доків", hint: "", w: "w-20", numeric: true },
  { key: "notes", label: "Нотатки для бота", hint: "", w: "min-w-[160px]" },
];

export function ModelsPanel({ models, deals, reload }: { models: OlxModel[]; deals: TerminalDeal[]; reload: () => Promise<void> }) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [fresh, setFresh] = useState<Draft>(empty());
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Models the bots found that have no price yet — the list to fill in first
  const unpriced = useMemo(() => {
    const c = new Map<string, number>();
    for (const d of deals) {
      if (d.buy || !(d.model || d.title)) continue;
      const name = (d.model || d.title)!;
      c.set(name, (c.get(name) ?? 0) + 1);
    }
    return Array.from(c.entries()).sort((a, b) => b[1] - a[1]);
  }, [deals]);

  const save = async (d: Draft) => {
    setBusy(d.id ?? "new");
    setMsg(null);
    try {
      const r = await fetch("/api/admin/olx/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: d.id,
          name: d.name,
          aliases: d.aliases,
          category: d.category,
          target_price: d.target_price,
          ceiling_price: d.ceiling_price,
          adjust: { new: d.new, used: d.used, no_box: d.no_box, no_docs: d.no_docs },
          notes: d.notes,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(j.error || "Не вдалося зберегти");
        return;
      }
      const id = d.id;
      if (id) {
        setDrafts((all) => {
          const rest = { ...all };
          delete rest[id];
          return rest;
        });
      } else setFresh(empty());
      setMsg(`Збережено: ${d.name}`);
      await reload();
    } finally {
      setBusy(null);
    }
  };

  const remove = async (m: OlxModel) => {
    if (!window.confirm(`Видалити «${m.name}» з цін? Угоди лишаться, але без цін.`)) return;
    setBusy(m.id);
    try {
      await fetch(`/api/admin/olx/models?id=${encodeURIComponent(m.id)}`, { method: "DELETE" });
      await reload();
    } finally {
      setBusy(null);
    }
  };

  const cell = (d: Draft, onChange: (d: Draft) => void) =>
    COLS.map((c) => (
      <td key={c.key} className="px-1.5 py-1.5">
        <input
          value={d[c.key] ?? ""}
          inputMode={c.numeric ? "numeric" : undefined}
          onChange={(e) => onChange({ ...d, [c.key]: c.numeric ? e.target.value.replace(/[^\d]/g, "") : e.target.value })}
          className={`${c.w} w-full rounded border border-zinc-300 px-2 py-1 text-sm ${c.numeric ? "text-right tabular-nums" : ""}`}
        />
      </td>
    ));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
        <p>
          Для кожної моделі — свої ціни. <b>Ціль</b>: за неї й нижче бот купує сам. <b>Стеля</b>: між ціллю і стелею бот питає вас, вище — відмовляє.
          Ціни — для стану «як нове» з коробкою і документами. Поправки праворуч — на скільки гривень обидві ціни змінюються, якщо прилад новий,
          б/у, без коробки чи без документів. Поки бот не дізнався стан, коробку чи документи — рахуємо як гірший варіант. Дефект — завжди ваше рішення.
        </p>
        {unpriced.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-amber-700">Боти знайшли, а ціни ще немає:</span>
            {unpriced.map(([name, n]) => (
              <button
                key={name}
                type="button"
                onClick={() => setFresh({ ...empty(name) })}
                className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs text-amber-900 hover:bg-amber-100"
                title="Додати ціну на цю модель"
              >
                + {name}
                {n > 1 ? ` ×${n}` : ""}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {msg ? <p className="text-sm text-zinc-600">{msg}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[1200px] text-sm">
          <thead className="bg-zinc-50 text-left text-xs text-zinc-500">
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className="px-1.5 py-2 font-medium">
                  <div className="uppercase tracking-wide">{c.label}</div>
                  {c.hint ? <div className="font-normal normal-case text-zinc-400">{c.hint}</div> : null}
                </th>
              ))}
              <th className="px-1.5 py-2" />
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-zinc-100 bg-emerald-50/40">
              {cell(fresh, setFresh)}
              <td className="whitespace-nowrap px-1.5 py-1.5">
                <button
                  type="button"
                  disabled={busy === "new" || !fresh.name.trim() || !fresh.target_price}
                  onClick={() => void save(fresh)}
                  className="rounded bg-emerald-600 px-3 py-1 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
                >
                  Додати
                </button>
              </td>
            </tr>
            {models.map((m) => {
              const d = drafts[m.id] ?? toDraft(m);
              const dirty = Boolean(drafts[m.id]);
              return (
                <tr key={m.id} className="border-t border-zinc-100">
                  {cell(d, (next) => setDrafts({ ...drafts, [m.id]: next }))}
                  <td className="whitespace-nowrap px-1.5 py-1.5">
                    <button
                      type="button"
                      disabled={!dirty || busy === m.id}
                      onClick={() => void save(d)}
                      className="rounded bg-zinc-900 px-3 py-1 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-30"
                    >
                      Зберегти
                    </button>
                    <button type="button" disabled={busy === m.id} onClick={() => void remove(m)} className="ml-1 rounded px-2 py-1 text-zinc-400 hover:text-red-600" title="Видалити">
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
            {!models.length ? (
              <tr>
                <td colSpan={COLS.length + 1} className="px-3 py-8 text-center text-zinc-400">
                  Ще немає жодної моделі з цінами — додайте першу в зеленому рядку вгорі.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
