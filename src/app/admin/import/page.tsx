"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminImportPage() {
  const [xml, setXml] = useState("");
  const [url, setUrl] = useState("");
  const [downloadImages, setDownloadImages] = useState(true);
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim() || undefined,
          xml: xml.trim() || undefined,
          downloadImages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка імпорту");
      setResult(
        `Імпортовано ${data.imported} товарів` +
          (data.imagesMirrored
            ? ` · зображень у Storage: ${data.imagesMirrored}`
            : "") +
          (data.categoriesInFeed
            ? ` · категорій у фіду: ${data.categoriesInFeed}`
            : "")
      );
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Помилка");
    } finally {
      setLoading(false);
    }
  };

  const onFile = async (file: File) => {
    const text = await file.text();
    setXml(text);
    setUrl("");
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">
          Імпорт з Prom.ua
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Завантажте XML/YML-фід: назви, ціни, характеристики, категорії.
          Зображення з{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">&lt;picture&gt;</code>{" "}
          скачуються в Supabase Storage (якщо налаштовано{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">
            SUPABASE_SERVICE_ROLE_KEY
          </code>
          ) і прив&apos;язуються до товарів.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-600">
            URL фіду
          </span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…/export/yml"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-600">
            Або файл .xml / .yml
          </span>
          <input
            type="file"
            accept=".xml,.yml,text/xml,application/xml"
            className="text-sm"
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-600">
            Або вставити XML
          </span>
          <textarea
            className="min-h-[180px] w-full rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
            value={xml}
            onChange={(e) => setXml(e.target.value)}
            placeholder='<?xml version="1.0"?><yml_catalog>…'
          />
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={downloadImages}
            onChange={(e) => setDownloadImages(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          Скачати зображення в Storage (рекомендовано)
        </label>

        <button
          type="button"
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          disabled={loading || (!xml.trim() && !url.trim())}
          onClick={run}
        >
          {loading ? "Імпорт…" : "Запустити імпорт"}
        </button>

        {result && (
          <p
            className={`rounded-lg px-4 py-3 text-sm ${
              result.startsWith("Імпортовано")
                ? "bg-emerald-50 text-emerald-800"
                : "bg-red-50 text-red-700"
            }`}
          >
            {result}
          </p>
        )}

        <Link
          href="/admin/products"
          className="inline-block text-sm font-medium text-sky-700 hover:underline"
        >
          → Переглянути товари
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="font-semibold text-zinc-700">Формат YML</p>
        <p className="mt-1">
          Підтримуються стандартні вузли{" "}
          <code>offer</code>: name, price, oldprice, picture, vendor, param,
          categoryId, available. Категорії та бренди створюються автоматично,
          якщо їх ще немає.
        </p>
      </div>
    </div>
  );
}
