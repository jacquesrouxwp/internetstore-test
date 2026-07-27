"use client";

import { useCallback, useEffect, useState } from "react";
import type { Competitor, CompetitorProductLink } from "@/lib/price-compare/types";
import type { Product } from "@/types";

export default function AdminPriceComparePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [links, setLinks] = useState<CompetitorProductLink[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [editComp, setEditComp] = useState<Record<string, { name: string; website: string }>>(
    {}
  );

  const loadCompetitors = useCallback(async () => {
    const res = await fetch("/api/admin/competitors");
    const data = await res.json();
    const list: Competitor[] = data.competitors || [];
    setCompetitors(list);
    const ed: Record<string, { name: string; website: string }> = {};
    list.forEach((c) => {
      ed[c.id] = { name: c.name, website: c.website || "" };
    });
    setEditComp(ed);
  }, []);

  const loadProducts = useCallback(async () => {
    const res = await fetch("/api/admin/products");
    const data = await res.json();
    setProducts(data.products || []);
  }, []);

  const loadLinks = useCallback(async (pid: string) => {
    if (!pid) {
      setLinks([]);
      return;
    }
    const res = await fetch(
      `/api/admin/price-links?productId=${encodeURIComponent(pid)}`
    );
    const data = await res.json();
    const list: CompetitorProductLink[] = data.links || [];
    setLinks(list);
    const u: Record<string, string> = {};
    list.forEach((l) => {
      u[l.competitorId] = l.productUrl;
    });
    setUrls(u);
  }, []);

  useEffect(() => {
    loadCompetitors();
    loadProducts();
  }, [loadCompetitors, loadProducts]);

  useEffect(() => {
    loadLinks(productId);
  }, [productId, loadLinks]);

  const saveCompetitor = async (c: Competitor) => {
    const ed = editComp[c.id];
    if (!ed?.name) return;
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/admin/competitors", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: c.id,
        slug: c.slug,
        name: ed.name,
        website: ed.website || null,
        sortOrder: c.sortOrder,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Помилка");
      return;
    }
    setMsg("Конкурента збережено");
    loadCompetitors();
  };

  const saveLink = async (competitorId: string) => {
    if (!productId) return;
    const productUrl = (urls[competitorId] || "").trim();
    if (!productUrl) {
      setMsg("Вкажіть URL картки у конкурента");
      return;
    }
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/admin/price-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, competitorId, productUrl }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Помилка збереження URL");
      return;
    }
    setMsg("URL збережено");
    loadLinks(productId);
  };

  const syncOne = async (linkId: string) => {
    setLoading(true);
    setMsg("Парсер читає сторінку…");
    const res = await fetch("/api/admin/price-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkId }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      setMsg(
        `Ціну зчитано: ${Number(data.price).toLocaleString("uk-UA")} ₴` +
          (data.method ? ` (${data.method})` : "")
      );
    } else {
      setMsg(data.error || "Не вдалося зчитати ціну");
    }
    loadLinks(productId);
  };

  /** Dry-run parser without saving */
  const testUrl = async (url: string) => {
    const u = url.trim();
    if (!u) {
      setMsg("Вставте URL картки товару");
      return;
    }
    setLoading(true);
    setMsg("Тест парсера…");
    const res = await fetch("/api/admin/price-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testUrl: u }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) {
      setMsg(
        `✓ Парсер OK: ${Number(data.price).toLocaleString("uk-UA")} ₴` +
          (data.method ? ` · спосіб: ${data.method}` : "") +
          " (не збережено — натисніть «Зберегти URL» + «Зчитати ціну»)"
      );
    } else {
      setMsg(`✗ Парсер: ${data.error || "ціну не знайдено"}`);
    }
  };

  const syncAll = async () => {
    setLoading(true);
    setMsg("Синхронізація всіх посилань…");
    const res = await fetch("/api/admin/price-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productId ? { productId } : {}),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || data.hint || "Помилка");
      return;
    }
    setMsg(`Готово: ${data.ok} ok, ${data.failed} помилок з ${data.total}`);
    if (productId) loadLinks(productId);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Порівняння цін</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Топ-3: <strong>OpticStore</strong>, <strong>ProfOptica</strong>,{" "}
          <strong>Optics-Pro</strong>. Вставте URL <em>картки товару</em> (не
          каталогу) → «Тест» перевіряє парсер → «Зберегти» + «Зчитати ціну».
          Автооновлення щодня о 06:00.
        </p>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-zinc-500">
          <li>
            OpticStore:{" "}
            <code className="rounded bg-zinc-100 px-1">
              …/product/teplovizor-…
            </code>
          </li>
          <li>
            ProfOptica:{" "}
            <code className="rounded bg-zinc-100 px-1">
              …/teplovizor-nazva-modeli/
            </code>
          </li>
          <li>
            Optics-Pro:{" "}
            <code className="rounded bg-zinc-100 px-1">
              …/ua/teplovizori/…/teplovizor-…
            </code>
          </li>
        </ol>
      </div>

      {msg && (
        <p className="rounded-lg bg-zinc-100 px-4 py-2 text-sm text-zinc-800">
          {msg}
        </p>
      )}

      {/* 3 competitors */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Топ-3 конкуренти
        </h2>
        <div className="space-y-4">
          {competitors.map((c, i) => (
            <div
              key={c.id}
              className="grid gap-2 rounded-lg border border-zinc-100 p-3 sm:grid-cols-[2rem_1fr_1fr_auto]"
            >
              <span className="text-sm font-bold text-zinc-400">#{i + 1}</span>
              <input
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Назва"
                value={editComp[c.id]?.name || ""}
                onChange={(e) =>
                  setEditComp((prev) => ({
                    ...prev,
                    [c.id]: {
                      name: e.target.value,
                      website: prev[c.id]?.website || "",
                    },
                  }))
                }
              />
              <input
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="https://сайт.ua"
                value={editComp[c.id]?.website || ""}
                onChange={(e) =>
                  setEditComp((prev) => ({
                    ...prev,
                    [c.id]: {
                      name: prev[c.id]?.name || c.name,
                      website: e.target.value,
                    },
                  }))
                }
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => saveCompetitor(c)}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
              >
                Зберегти
              </button>
            </div>
          ))}
          {!competitors.length && (
            <p className="text-sm text-amber-700">
              Немає конкурентів. Застосуйте SQL{" "}
              <code className="rounded bg-zinc-100 px-1">
                002_price_compare.sql
              </code>{" "}
              у Supabase.
            </p>
          )}
        </div>
      </section>

      {/* Product links */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              URL товарів у конкурентів
            </h2>
            <select
              className="mt-2 w-full max-w-md rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              <option value="">— оберіть товар —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nameUk} · {p.price} ₴
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={syncAll}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {productId
              ? "Синхронізувати цей товар"
              : "Синхронізувати всі посилання"}
          </button>
        </div>

        {productId && (
          <div className="space-y-3">
            {competitors.map((c) => {
              const link = links.find((l) => l.competitorId === c.id);
              return (
                <div
                  key={c.id}
                  className="rounded-lg border border-zinc-100 p-3"
                >
                  <p className="mb-2 text-sm font-semibold text-zinc-800">
                    {c.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                      placeholder="https://competitor.ua/product/..."
                      value={urls[c.id] || ""}
                      onChange={(e) =>
                        setUrls((prev) => ({
                          ...prev,
                          [c.id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => testUrl(urls[c.id] || "")}
                      className="rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
                    >
                      Тест парсера
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => saveLink(c.id)}
                      className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium"
                    >
                      Зберегти URL
                    </button>
                    {link && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => syncOne(link.id)}
                        className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
                      >
                        Зчитати ціну
                      </button>
                    )}
                  </div>
                  {link && (
                    <p className="mt-2 text-xs text-zinc-500">
                      Остання ціна:{" "}
                      <strong>
                        {link.lastPrice != null
                          ? `${link.lastPrice} ₴`
                          : "—"}
                      </strong>
                      {link.lastCheckedAt
                        ? ` · ${new Date(link.lastCheckedAt).toLocaleString("uk-UA")}`
                        : ""}
                      {link.lastError ? (
                        <span className="text-red-600">
                          {" "}
                          · помилка: {link.lastError}
                        </span>
                      ) : null}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
