"use client";

import { useCallback, useEffect, useState } from "react";

type Stats = {
  ok: boolean;
  error?: string;
  days: number;
  total: number;
  byChannel: Record<string, number>;
  bySource: Record<string, number>;
  byDay: { date: string; count: number }[];
  recent: {
    id: string;
    channel: string;
    source: string;
    path: string | null;
    created_at: string;
  }[];
};

const CHANNEL_LABEL: Record<string, string> = {
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  phone: "Дзвінок",
  open_sheet: "Відкрив вікно",
};

const SOURCE_LABEL: Record<string, string> = {
  hero: "Hero",
  widget: "Віджет",
  footer: "Футер",
  header: "Шапка",
  catalog: "Каталог",
  other: "Інше",
};

export default function AdminConsultStatsPage() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/consult-stats?days=${days}`);
      const d = (await r.json()) as Stats;
      setStats(d);
    } catch {
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">
            Звернення до менеджера
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">
            Кліки «написати» / «зателефонувати» на сайті. Це намір звʼязатися —
            не гарантія, що людина дописала в Telegram/WhatsApp.
          </p>
        </div>
        <label className="text-sm text-zinc-600">
          Період{" "}
          <select
            className="ml-1 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>7 днів</option>
            <option value={30}>30 днів</option>
            <option value={90}>90 днів</option>
          </select>
        </label>
      </div>

      {loading && (
        <p className="text-sm text-zinc-500">Завантаження…</p>
      )}

      {!loading && stats && !stats.ok && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {stats.error || "Не вдалося завантажити"}
          {stats.error?.includes("006_") && (
            <p className="mt-2 text-xs">
              У Supabase SQL Editor виконайте файл{" "}
              <code className="rounded bg-amber-100 px-1">
                supabase/migrations/006_consult_events.sql
              </code>
            </p>
          )}
        </div>
      )}

      {!loading && stats && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Усього кліків" value={stats.total} accent />
            {(["telegram", "whatsapp", "phone"] as const).map((ch) => (
              <StatCard
                key={ch}
                label={CHANNEL_LABEL[ch] || ch}
                value={stats.byChannel[ch] || 0}
              />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-800">
                За джерелом
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {Object.entries(stats.bySource).length === 0 && (
                  <li className="text-zinc-400">Поки немає даних</li>
                )}
                {Object.entries(stats.bySource)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <li
                      key={k}
                      className="flex justify-between border-b border-zinc-100 py-1.5"
                    >
                      <span>{SOURCE_LABEL[k] || k}</span>
                      <strong>{v}</strong>
                    </li>
                  ))}
              </ul>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-800">По днях</h2>
              <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto text-sm">
                {stats.byDay.length === 0 && (
                  <li className="text-zinc-400">Поки немає даних</li>
                )}
                {[...stats.byDay].reverse().map((d) => (
                  <li
                    key={d.date}
                    className="flex justify-between border-b border-zinc-100 py-1"
                  >
                    <span className="tabular-nums text-zinc-600">{d.date}</span>
                    <strong>{d.count}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-zinc-800">
              Останні кліки
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-xs uppercase text-zinc-500">
                    <th className="py-2 pr-2">Час</th>
                    <th className="py-2 pr-2">Канал</th>
                    <th className="py-2 pr-2">Звідки</th>
                    <th className="py-2">Сторінка</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-zinc-400">
                        Немає записів — натисніть Telegram/WhatsApp на сайті
                        після міграції.
                      </td>
                    </tr>
                  )}
                  {stats.recent.map((r) => (
                    <tr key={r.id} className="border-b border-zinc-100">
                      <td className="py-2 pr-2 tabular-nums text-zinc-600">
                        {new Date(r.created_at).toLocaleString("uk-UA")}
                      </td>
                      <td className="py-2 pr-2">
                        {CHANNEL_LABEL[r.channel] || r.channel}
                      </td>
                      <td className="py-2 pr-2">
                        {SOURCE_LABEL[r.source] || r.source}
                      </td>
                      <td className="max-w-[220px] truncate py-2 text-zinc-500">
                        {r.path || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-xl border border-red-200 bg-red-50 p-4 shadow-sm"
          : "rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
      }
    >
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={
          accent
            ? "mt-1 text-3xl font-bold tabular-nums text-red-700"
            : "mt-1 text-3xl font-bold tabular-nums text-zinc-900"
        }
      >
        {value}
      </p>
    </div>
  );
}
