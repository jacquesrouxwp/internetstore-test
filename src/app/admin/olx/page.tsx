"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  CONDITION_LABEL,
  OLX_STATUSES,
  STATUS_LABEL,
  zone,
  type BuyPrices,
  type OlxModel,
  type OlxStatus,
  type TerminalDeal,
} from "@/lib/olx-terminal";
import { ModelsPanel } from "./ModelsPanel";
import { ProTerminal } from "./ProTerminal";

type Row = TerminalDeal;

const money = (n: number | null | undefined) =>
  n ? new Intl.NumberFormat("uk-UA").format(n) : "—";

const ZONE_CLASS = {
  good: "text-emerald-700 bg-emerald-50",
  owner: "text-amber-700 bg-amber-50",
  out: "text-red-700 bg-red-50",
} as const;

const STATUS_CLASS: Record<OlxStatus, string> = {
  new: "bg-sky-100 text-sky-800",
  negotiating: "bg-zinc-100 text-zinc-800",
  needs_ok: "bg-amber-100 text-amber-900 font-semibold",
  bought: "bg-emerald-100 text-emerald-800",
  rejected: "bg-zinc-200 text-zinc-500",
  lost: "bg-zinc-200 text-zinc-500",
};

function Price({ value, buy }: { value: number | null; buy: BuyPrices | null }) {
  if (!value) return <span className="text-zinc-400">—</span>;
  const z = zone(value, buy);
  return <span className={`inline-block rounded px-1.5 py-0.5 tabular-nums ${z ? ZONE_CLASS[z] : ""}`}>{money(value)}</span>;
}

/** "як нове · коробка ✓ · без документів", "?" where the bot has not found out yet. */
function conditionText(r: Row) {
  const yn = (v: boolean | null, yes: string, no: string, ask: string) => (v === true ? yes : v === false ? no : ask);
  return [
    r.condition === "defect" ? CONDITION_LABEL.defect : r.grade ? (r.grade === 10 ? "нове" : `${r.grade}/10`) : r.condition ? CONDITION_LABEL[r.condition] : "стан ?",
    yn(r.has_box, "коробка ✓", "без коробки", "коробка ?"),
    yn(r.has_docs, "документи ✓", "без документів", "документи ?"),
  ].join(" · ");
}

function ago(iso: string) {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "щойно";
  if (m < 60) return `${m} хв`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} год` : `${Math.round(h / 24)} д`;
}

export default function AdminOlxTerminalPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"active" | "all" | OlxStatus>("active");
  const [open, setOpen] = useState<string | null>(null);
  const [okPrice, setOkPrice] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ olx_url: "", model: "", seller_name: "", asking_price: "" });
  const [formMsg, setFormMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [models, setModels] = useState<OlxModel[]>([]);
  // "Класичний" table, the "Pro" trading screen or the price list; remembered in this browser
  const [view, setView] = useState<"classic" | "pro" | "models">("classic");
  useEffect(() => {
    try {
      const v = localStorage.getItem("olx-view");
      if (v === "pro" || v === "models") setView(v);
    } catch {}
  }, []);
  const switchView = (v: "classic" | "pro" | "models") => {
    setView(v);
    try {
      localStorage.setItem("olx-view", v);
    } catch {}
  };

  const addListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMsg(null);
    const r = await fetch("/api/admin/olx", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, status: "new" }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setFormMsg(d.error || "Не вдалося додати");
      return;
    }
    setForm({ olx_url: "", model: "", seller_name: "", asking_price: "" });
    setFormMsg(d.deal?.buy ? "Додано, ціни на модель знайдено" : "Додано, але ціни на цю модель ще немає — додайте її в «Моделі й ціни»");
    await load();
  };

  const requestRefresh = async (id: string) => {
    await fetch("/api/admin/olx", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, refresh: true }),
    });
    await load();
  };

  const [refreshAllMsg, setRefreshAllMsg] = useState<string | null>(null);
  const refreshAll = async () => {
    const r = await fetch("/api/admin/olx?refresh=all", { method: "POST" });
    const d = await r.json().catch(() => ({}));
    setRefreshAllMsg(r.ok ? `Запит надіслано ботам: ${d.requested ?? 0} угод` : d.error || "Не вдалося");
    await load();
  };

  // Opening a deal asks the bot to re-read that chat (not more often than every 2 min)
  const openDeal = (r: Row) => {
    const next = open === r.id ? null : r.id;
    setOpen(next);
    if (next && ["new", "negotiating", "needs_ok"].includes(r.status)) {
      const last = r.refresh_requested_at ? Date.parse(r.refresh_requested_at) : 0;
      if (Date.now() - last > 2 * 60 * 1000) void requestRefresh(r.id);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Видалити цей запис з термінала?")) return;
    setBusy(id);
    try {
      await fetch(`/api/admin/olx?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const load = useCallback(async () => {
    try {
      const [r, m] = await Promise.all([
        fetch("/api/admin/olx", { cache: "no-store" }),
        fetch("/api/admin/olx/models", { cache: "no-store" }),
      ]);
      const d = await r.json();
      const md = await m.json().catch(() => ({}));
      setRows(d.deals ?? []);
      setModels(md.models ?? []);
      setError(d.error ?? (md.error?.includes("olx_models") ? "olx_models" : null));
    } catch {
      setError("Не вдалося завантажити");
    }
  }, []);

  // Esc folds the open deal
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 15000);
    return () => clearInterval(t);
  }, [load]);

  const decide = async (id: string, body: Record<string, unknown>) => {
    setBusy(id);
    try {
      await fetch("/api/admin/olx", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...body }),
      });
      await load();
    } finally {
      setBusy(null);
    }
  };

  const shown = useMemo(
    () =>
      rows.filter((r) =>
        filter === "all"
          ? true
          : filter === "active"
            ? ["new", "negotiating", "needs_ok"].includes(r.status)
            : r.status === filter,
      ),
    [rows, filter],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);

  const boughtStats = useMemo(() => {
    const b = rows.filter((r) => r.status === "bought" && r.final_price);
    if (!b.length) return null;
    return { n: b.length, spent: b.reduce((s, r) => s + (r.final_price as number), 0) };
  }, [rows]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">OLX-термінал</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Знахідки й торг ботів. Ціни — ваші діапазони «від–до» для кожної моделі за станом приладу.
            Оновлюється кожні 15 с.
          </p>
        </div>
        <div className="flex overflow-hidden rounded-lg border border-zinc-300 text-sm">
          {(["classic", "pro", "models"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => switchView(v)}
              className={`px-3 py-1.5 ${view === v ? (v === "pro" ? "bg-zinc-900 font-semibold text-white" : "bg-zinc-200 font-semibold text-zinc-900") : "text-zinc-600 hover:bg-zinc-100"}`}
            >
              {v === "pro" ? "Pro" : v === "models" ? "Моделі й ціни" : "Класичний"}
            </button>
          ))}
        </div>
        {boughtStats ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            Куплено: <b>{boughtStats.n}</b> на <b>{money(boughtStats.spent)}</b> грн
          </div>
        ) : null}
      </div>

      {error === "olx_models" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Таблиці цін olx_models ще немає в базі — запустіть міграцію 012_olx_models.sql у Supabase.
        </p>
      ) : null}

      {view === "models" ? (
        <ModelsPanel models={models} deals={rows} reload={load} />
      ) : view === "pro" ? (
        <ProTerminal rows={rows} models={models} busy={busy} decide={decide} requestRefresh={requestRefresh} refreshAll={refreshAll} />
      ) : (
      <>
      <form onSubmit={addListing} className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 bg-white p-3 text-sm">
        <label className="flex min-w-[260px] flex-1 flex-col text-xs text-zinc-500">
          Посилання OLX
          <input required value={form.olx_url} onChange={(e) => setForm({ ...form, olx_url: e.target.value })} placeholder="https://www.olx.ua/d/uk/obyavlenie/..." className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900" />
        </label>
        <label className="flex min-w-[200px] flex-col text-xs text-zinc-500">
          Модель
          <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="Axion 2 XQ35 LRF" className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900" />
        </label>
        <label className="flex w-36 flex-col text-xs text-zinc-500">
          Продавець
          <input value={form.seller_name} onChange={(e) => setForm({ ...form, seller_name: e.target.value })} className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900" />
        </label>
        <label className="flex w-28 flex-col text-xs text-zinc-500">
          Хоче, грн
          <input inputMode="numeric" value={form.asking_price} onChange={(e) => setForm({ ...form, asking_price: e.target.value })} className="mt-1 rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900" />
        </label>
        <button type="submit" className="rounded bg-zinc-900 px-3 py-1.5 font-semibold text-white hover:bg-zinc-700">Додати</button>
        {formMsg ? <p className="w-full text-xs text-zinc-600">{formMsg}</p> : null}
      </form>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          type="button"
          onClick={() => void refreshAll()}
          className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1 font-semibold text-sky-800 hover:bg-sky-100"
          title="Попросити ботів перечитати всі активні чати"
        >
          ⟳ Оновити все
        </button>
        {refreshAllMsg ? <span className="text-xs text-zinc-500">{refreshAllMsg}</span> : null}
        <span className="mx-1 h-5 w-px bg-zinc-200" />
        {(["active", "needs_ok", "new", "negotiating", "bought", "rejected", "lost", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 ${filter === f ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"}`}
          >
            {f === "active" ? "Активні" : f === "all" ? "Усі" : STATUS_LABEL[f]}
            {f !== "active" && f !== "all" && counts[f] ? ` · ${counts[f]}` : ""}
          </button>
        ))}
      </div>

      {error && error !== "olx_models" ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error.includes("olx_deals") ? "Таблиці olx_deals ще немає в базі — запустіть міграцію 008_olx_terminal.sql у Supabase." : error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2">Модель</th>
              <th className="px-3 py-2">Продавець</th>
              <th className="px-3 py-2">Хоче</th>
              <th className="px-3 py-2">Пропонуємо</th>
              <th className="px-3 py-2">Торг на</th>
              <th className="px-3 py-2">Наш діапазон</th>
              <th className="px-3 py-2">Статус</th>
              <th className="px-3 py-2">Оновлено</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const isOpen = open === r.id;
              return (
                <Fragment key={r.id}>
                  <tr
                    className={`cursor-pointer border-t border-zinc-100 hover:bg-zinc-50 ${r.status === "needs_ok" ? "bg-amber-50/60" : ""}`}
                    onClick={() => openDeal(r)}
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-zinc-900">
                        <span className="mr-1 inline-block w-3 text-zinc-400">{isOpen ? "▴" : "▾"}</span>
                        {r.buy?.model_name || r.model || r.title || "—"}
                      </div>
                      <a
                        href={r.olx_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-sky-700 hover:underline"
                      >
                        OLX ↗{r.city ? ` · ${r.city}` : ""}
                      </a>
                      {!r.buy ? <span className="ml-2 text-xs text-amber-700">немає ціни на модель</span> : null}
                      <div className="text-[11px] text-zinc-500">{conditionText(r)}</div>
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {r.seller_name || "—"}
                      {r.chat?.length ? (
                        <span
                          className="ml-1.5 inline-block rounded-full bg-zinc-100 px-1.5 text-[11px] text-zinc-600"
                          title={`Усього повідомлень: ${r.chat.length}`}
                        >
                          💬 ми {r.chat.filter((m) => m.from === "us").length} · продавець{" "}
                          {r.chat.filter((m) => m.from === "seller").length}
                        </span>
                      ) : null}
                      {r.listed_at ? (
                        <div className="text-[11px] text-zinc-400" title="Коли продавець опублікував оголошення">
                          опубл. {new Date(r.listed_at).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" })}, {ago(r.listed_at)} тому
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2"><Price value={r.asking_price} buy={r.buy} /></td>
                    <td className="px-3 py-2"><Price value={r.our_offer} buy={r.buy} /></td>
                    <td className="px-3 py-2"><Price value={r.bargain_at} buy={r.buy} /></td>
                    <td className="px-3 py-2 tabular-nums text-zinc-600">
                      {r.buy?.to ? `${money(r.buy.from)}–${money(r.buy.to)}` : "—"}
                      {r.buy?.tier_label ? <div className="text-[10px] text-zinc-500">{r.buy.tier_label}{r.buy.needs_ok ? " · ваш ок" : ""}</div> : null}
                      {r.buy?.unknown.length ? <div className="text-[10px] text-amber-700">уточнити: {r.buy.unknown.join(", ")}</div> : null}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                      {r.owner_decision ? <div className="mt-0.5 text-[11px] text-zinc-500">ваше: {r.owner_decision}</div> : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-500">
                      <div className="flex items-center gap-1.5">
                        {ago(r.updated_at)}
                        <button
                          type="button"
                          title="Попросити бота перечитати цей чат зараз"
                          onClick={(e) => {
                            e.stopPropagation();
                            void requestRefresh(r.id);
                          }}
                          className="rounded border border-zinc-300 px-1.5 leading-5 text-zinc-600 hover:bg-zinc-100"
                        >
                          ⟳
                        </button>
                      </div>
                      {r.refresh_requested_at ? (
                        <div className="mt-0.5 text-[10px] text-sky-700">⟳ чекає бота · {ago(r.refresh_requested_at)}</div>
                      ) : null}
                    </td>
                  </tr>
                  {isOpen ? (
                    <tr className="border-t border-zinc-100 bg-zinc-50/60">
                      <td colSpan={8} className="px-3 py-3">
                        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                          <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-3">
                            {r.chat?.length ? (
                              r.chat.map((m, i) => (
                                <div key={i} className={`flex ${m.from === "us" ? "justify-end" : "justify-start"}`}>
                                  <div className={`max-w-[75%] rounded-2xl px-3 py-1.5 ${m.from === "us" ? "bg-sky-600 text-white" : "bg-zinc-100 text-zinc-900"}`}>
                                    <div className="whitespace-pre-wrap">{m.text}</div>
                                    <div className={`mt-0.5 text-[10px] ${m.from === "us" ? "text-sky-100" : "text-zinc-400"}`}>
                                      {new Date(m.at).toLocaleString("uk-UA", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-zinc-400">Переписки ще немає.</p>
                            )}
                            {(r.outbox || [])
                              .filter((m) => !m.sent_at)
                              .map((m) => (
                                <div key={m.id} className="flex justify-end">
                                  <div className="max-w-[75%] rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-1.5 text-zinc-600">
                                    <div className="whitespace-pre-wrap">{m.text}</div>
                                    <div className="mt-0.5 text-[10px] text-zinc-400">⏳ чекає відправки ботом</div>
                                  </div>
                                </div>
                              ))}
                            <form
                              className="sticky bottom-0 flex gap-2 border-t border-zinc-100 bg-white pt-2"
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const text = (draft[r.id] || "").trim();
                                if (!text) return;
                                await decide(r.id, { send: text });
                                setDraft({ ...draft, [r.id]: "" });
                              }}
                            >
                              <textarea
                                rows={2}
                                value={draft[r.id] ?? ""}
                                onChange={(e) => setDraft({ ...draft, [r.id]: e.target.value })}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) e.currentTarget.form?.requestSubmit();
                                }}
                                placeholder="Ваше повідомлення продавцю — бот надішле як є (Ctrl+Enter)"
                                className="flex-1 resize-none rounded border border-zinc-300 px-2 py-1 text-sm"
                              />
                              <button
                                type="submit"
                                disabled={busy === r.id || !(draft[r.id] || "").trim()}
                                className="self-end rounded bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
                              >
                                Надіслати через бота
                              </button>
                            </form>
                          </div>
                          <div className="space-y-3 text-sm">
                            <button
                              type="button"
                              onClick={() => setOpen(null)}
                              className="w-full rounded border border-zinc-300 bg-white px-3 py-1.5 text-zinc-700 hover:bg-zinc-100"
                            >
                              ▴ Згорнути
                            </button>
                            {r.title ? <p className="text-zinc-600">«{r.title}»</p> : null}
                            {r.notes ? <p className="rounded border border-zinc-200 bg-white p-2 text-zinc-700">{r.notes}</p> : null}
                            <div className="rounded-lg border border-zinc-200 bg-white p-3">
                              <p className="mb-2 font-semibold text-zinc-900">Ваше рішення</p>
                              <div className="flex gap-2">
                                <input
                                  inputMode="numeric"
                                  placeholder={String(r.bargain_at || r.our_offer || r.buy?.from || "")}
                                  value={okPrice[r.id] ?? ""}
                                  onChange={(e) => setOkPrice({ ...okPrice, [r.id]: e.target.value })}
                                  className="w-28 rounded border border-zinc-300 px-2 py-1"
                                />
                                <button
                                  type="button"
                                  disabled={busy === r.id}
                                  onClick={() =>
                                    decide(r.id, {
                                      decision: "ok",
                                      price: Number((okPrice[r.id] || String(r.bargain_at || r.our_offer || "")).replace(/\D/g, "")),
                                    })
                                  }
                                  className="rounded bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                                >
                                  Ок на цю ціну
                                </button>
                                <button
                                  type="button"
                                  disabled={busy === r.id}
                                  onClick={() => decide(r.id, { decision: "no" })}
                                  className="rounded border border-zinc-300 px-3 py-1 text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                                >
                                  Ні
                                </button>
                              </div>
                              <button
                                type="button"
                                disabled={busy === r.id}
                                onClick={() => remove(r.id)}
                                className="mt-3 text-xs text-red-600 hover:underline disabled:opacity-50"
                              >
                                Видалити запис
                              </button>
                              <label className="mt-3 block text-xs text-zinc-500">
                                Статус
                                <select
                                  value={r.status}
                                  disabled={busy === r.id}
                                  onChange={(e) => decide(r.id, { status: e.target.value })}
                                  className="mt-1 block w-full rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-900"
                                >
                                  {OLX_STATUSES.map((s) => (
                                    <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                                  ))}
                                </select>
                              </label>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
            {!shown.length ? (
              <tr>
                <td colSpan={8} className="px-3 py-10 text-center text-zinc-400">
                  Поки порожньо — боти ще нічого не внесли.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      </>
      )}
    </div>
  );
}
