"use client";

import { useState } from "react";
import Link from "next/link";

type DiscoverItem = { root: string; url: string };

type ProcessResult =
  | {
      status: "created" | "updated";
      url: string;
      name: string;
      brandSlug: string;
      categorySlug: string;
      price: number | null;
      imageCount: number;
      imagesConsistent: boolean;
      missingPrice: boolean;
      fewSpecs: boolean;
    }
  | { status: "skipped"; url: string; reason: string };

type Summary = {
  created: number;
  updated: number;
  skipped: number;
  skipReasons: Record<string, number>;
  byBrand: Record<string, number>;
  byCategory: Record<string, number>;
  missingPrice: string[];
  fewSpecs: string[];
  imagesFlagged: string[];
};

function emptySummary(): Summary {
  return {
    created: 0,
    updated: 0,
    skipped: 0,
    skipReasons: {},
    byBrand: {},
    byCategory: {},
    missingPrice: [],
    fewSpecs: [],
    imagesFlagged: [],
  };
}

function bump(rec: Record<string, number>, key: string) {
  rec[key] = (rec[key] || 0) + 1;
}

const BATCH_SIZE = 30;

export default function OpticsProImportPage() {
  const [phase, setPhase] = useState<
    "idle" | "discovering" | "ready" | "running" | "done" | "error"
  >("idle");
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [byRoot, setByRoot] = useState<Record<string, number>>({});
  const [dryRun, setDryRun] = useState(true);
  const [downloadImages, setDownloadImages] = useState(true);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<Summary>(emptySummary());
  const [error, setError] = useState("");

  const discover = async () => {
    setPhase("discovering");
    setError("");
    try {
      const res = await fetch("/api/admin/import/optics-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "discover" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка discover");
      setItems(data.items);
      setByRoot(data.byRoot);
      setPhase("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка");
      setPhase("error");
    }
  };

  const run = async () => {
    setPhase("running");
    setError("");
    const acc = emptySummary();
    setSummary(acc);
    setProgress({ done: 0, total: items.length });

    for (let i = 0; i < items.length; i += BATCH_SIZE) {
      const batch = items.slice(i, i + BATCH_SIZE);
      try {
        const res = await fetch("/api/admin/import/optics-pro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "process",
            items: batch,
            dryRun,
            downloadImages,
            ensureSeed: i === 0,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Помилка процесингу");
        const results: ProcessResult[] = data.results;
        for (const r of results) {
          if (r.status === "skipped") {
            acc.skipped++;
            const key = r.reason.split(":")[0];
            bump(acc.skipReasons, key);
          } else {
            if (r.status === "created") acc.created++;
            else acc.updated++;
            bump(acc.byBrand, r.brandSlug);
            bump(acc.byCategory, r.categorySlug);
            if (r.missingPrice) acc.missingPrice.push(r.name);
            if (r.fewSpecs) acc.fewSpecs.push(r.name);
            if (!r.imagesConsistent) acc.imagesFlagged.push(r.name);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Помилка");
        setPhase("error");
        return;
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, items.length), total: items.length });
      setSummary({ ...acc });
    }
    setPhase("done");
  };

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Імпорт з optics-pro.com.ua
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Тільки товари наших категорій і брендів. Описи переносяться як є з
          позначкою на переписування пізніше; ціни/характеристики
          нормалізуються в числа. Імпорт завжди створює чернетки
          (<code className="rounded bg-zinc-100 px-1 text-xs">published=false</code>) —
          власник перевіряє і публікує вручну.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              disabled={phase === "running"}
            />
            Пробний прогін (без запису в БД і без фото)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded"
              checked={downloadImages}
              onChange={(e) => setDownloadImages(e.target.checked)}
              disabled={phase === "running" || dryRun}
            />
            Завантажувати фото в Storage
          </label>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            className="rounded-lg bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-900 disabled:opacity-50"
            onClick={discover}
            disabled={phase === "discovering" || phase === "running"}
          >
            {phase === "discovering" ? "Скануємо категорії…" : "1. Сканувати категорії"}
          </button>
          <button
            type="button"
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            onClick={run}
            disabled={!items.length || phase === "running" || phase === "discovering"}
          >
            {phase === "running" ? "Імпорт…" : "2. Запустити імпорт"}
          </button>
        </div>

        {items.length > 0 && phase !== "running" && phase !== "done" && (
          <div className="rounded-lg bg-zinc-50 p-4 text-xs text-zinc-600">
            <p className="font-semibold text-zinc-700">
              Знайдено {items.length} сторінок товарів у {Object.keys(byRoot).length} категоріях донора:
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {Object.entries(byRoot).map(([root, n]) => (
                <li key={root}>
                  {root}: <span className="font-medium">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(phase === "running" || phase === "done") && (
          <div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full bg-red-600 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {progress.done} / {progress.total} ({pct}%)
              {phase === "done" && dryRun ? " · пробний прогін, нічого не записано" : ""}
              {phase === "done" && !dryRun ? " · готово" : ""}
            </p>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {(phase === "running" || phase === "done") && (
          <div className="space-y-3 rounded-lg border border-zinc-200 p-4 text-sm">
            <p>
              {dryRun ? "Було б створено" : "Створено"}: <b>{summary.created}</b> ·{" "}
              {dryRun ? "було б оновлено" : "оновлено"}: <b>{summary.updated}</b> · пропущено:{" "}
              <b>{summary.skipped}</b>
            </p>

            {Object.keys(summary.skipReasons).length > 0 && (
              <div>
                <p className="font-medium text-zinc-700">Причини пропуску:</p>
                <ul className="ml-4 list-disc text-zinc-600">
                  {Object.entries(summary.skipReasons).map(([k, n]) => (
                    <li key={k}>
                      {k}: {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Object.keys(summary.byCategory).length > 0 && (
              <div>
                <p className="font-medium text-zinc-700">По категоріях:</p>
                <ul className="ml-4 list-disc text-zinc-600">
                  {Object.entries(summary.byCategory).map(([k, n]) => (
                    <li key={k}>
                      {k}: {n}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Object.keys(summary.byBrand).length > 0 && (
              <div>
                <p className="font-medium text-zinc-700">По брендах:</p>
                <ul className="ml-4 grid grid-cols-2 list-disc text-zinc-600 sm:grid-cols-3">
                  {Object.entries(summary.byBrand)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, n]) => (
                      <li key={k}>
                        {k}: {n}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {summary.missingPrice.length > 0 && (
              <details>
                <summary className="cursor-pointer font-medium text-amber-700">
                  Без ціни: {summary.missingPrice.length}
                </summary>
                <ul className="ml-4 list-disc text-zinc-600">
                  {summary.missingPrice.slice(0, 50).map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </details>
            )}

            {summary.fewSpecs.length > 0 && (
              <details>
                <summary className="cursor-pointer font-medium text-amber-700">
                  Мало характеристик (&lt;8): {summary.fewSpecs.length}
                </summary>
                <ul className="ml-4 list-disc text-zinc-600">
                  {summary.fewSpecs.slice(0, 50).map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </details>
            )}

            {summary.imagesFlagged.length > 0 && (
              <details>
                <summary className="cursor-pointer font-medium text-amber-700">
                  Фото під питанням (донор переплутав галерею) — потребують
                  ручної перевірки: {summary.imagesFlagged.length}
                </summary>
                <ul className="ml-4 list-disc text-zinc-600">
                  {summary.imagesFlagged.slice(0, 50).map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <Link
          href="/admin/products"
          className="inline-block text-sm font-medium text-sky-700 hover:underline"
        >
          → Переглянути товари
        </Link>
      </div>
    </div>
  );
}
