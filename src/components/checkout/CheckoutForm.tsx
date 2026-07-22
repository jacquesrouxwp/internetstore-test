"use client";

import { useCart } from "@/lib/cart-store";
import { useLocale, useTranslations } from "next-intl";
import { formatPrice } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "@/i18n/routing";

type City = { Ref: string; Description: string; Area?: string };
type Warehouse = {
  Ref: string;
  Description: string;
  Number?: string;
  ShortAddress?: string;
  Category?: string;
};

export function CheckoutForm() {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const router = useRouter();
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const cartTotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items]
  );

  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [payment, setPayment] = useState("cod");

  // City autocomplete
  const [cityQuery, setCityQuery] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [city, setCity] = useState<City | null>(null);
  const [citiesOpen, setCitiesOpen] = useState(false);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState("");
  const [npDemo, setNpDemo] = useState(false);

  // Warehouses
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [whQuery, setWhQuery] = useState("");
  const [whOpen, setWhOpen] = useState(false);
  const [whLoading, setWhLoading] = useState(false);
  const [whError, setWhError] = useState("");

  const [deliveryCost, setDeliveryCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  const cityBoxRef = useRef<HTMLDivElement>(null);
  const whBoxRef = useRef<HTMLDivElement>(null);
  const cityAbort = useRef<AbortController | null>(null);

  useEffect(() => setMounted(true), []);

  // Close dropdowns on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (cityBoxRef.current && !cityBoxRef.current.contains(t)) {
        setCitiesOpen(false);
      }
      if (whBoxRef.current && !whBoxRef.current.contains(t)) {
        setWhOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced city search (from 2 chars)
  useEffect(() => {
    if (city) return;
    const q = cityQuery.trim();
    if (q.length < 2) {
      setCities([]);
      setCitiesLoading(false);
      setCitiesError("");
      return;
    }

    setCitiesLoading(true);
    setCitiesError("");
    const timer = setTimeout(async () => {
      cityAbort.current?.abort();
      const ac = new AbortController();
      cityAbort.current = ac;
      try {
        const res = await fetch(
          `/api/nova-poshta?action=cities&q=${encodeURIComponent(q)}`,
          { signal: ac.signal }
        );
        const data = await res.json();
        if (ac.signal.aborted) return;
        setCities(data.cities || []);
        setCitiesOpen(true);
        if (data.demo) setNpDemo(true);
        if (!(data.cities || []).length) {
          setCitiesError(t("noCities"));
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setCities([]);
        setCitiesError(t("noCities"));
      } finally {
        if (!ac.signal.aborted) setCitiesLoading(false);
      }
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [cityQuery, city, t]);

  // Load warehouses when city selected
  const loadWarehouses = useCallback(async (cityRef: string) => {
    setWhLoading(true);
    setWhError("");
    setWarehouses([]);
    setWarehouse(null);
    setWhQuery("");
    try {
      const res = await fetch(
        `/api/nova-poshta?action=warehouses&cityRef=${encodeURIComponent(cityRef)}`
      );
      const data = await res.json();
      setWarehouses(data.warehouses || []);
      if (data.demo) setNpDemo(true);
      if (!(data.warehouses || []).length) {
        setWhError(t("noWarehouses"));
      }
    } catch {
      setWarehouses([]);
      setWhError(t("noWarehouses"));
    } finally {
      setWhLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!city?.Ref) return;
    loadWarehouses(city.Ref);

    // delivery cost
    (async () => {
      try {
        const costRes = await fetch(
          `/api/nova-poshta?action=cost&cityRef=${encodeURIComponent(city.Ref)}&weight=1&price=${cartTotal}`
        );
        const costData = await costRes.json();
        setDeliveryCost(Number(costData.cost || 0));
      } catch {
        setDeliveryCost(90);
      }
    })();
  }, [city, cartTotal, loadWarehouses]);

  const filteredWarehouses = useMemo(() => {
    const q = whQuery.trim().toLowerCase();
    if (!q) return warehouses;
    return warehouses.filter((w) =>
      `${w.Description} ${w.Number || ""} ${w.ShortAddress || ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [warehouses, whQuery]);

  const grand = useMemo(
    () => cartTotal + deliveryCost,
    [cartTotal, deliveryCost]
  );

  const selectCity = (c: City) => {
    setCity(c);
    setCityQuery(c.Description);
    setCities([]);
    setCitiesOpen(false);
  };

  const selectWarehouse = (w: Warehouse) => {
    setWarehouse(w);
    setWhQuery(w.Description);
    setWhOpen(false);
  };

  if (!mounted) return null;

  if (done) {
    return (
      <div className="card-surface mx-auto max-w-lg p-10 text-center">
        <h2 className="text-2xl font-semibold text-ink">{t("success")}</h2>
        <p className="mt-3 text-muted">
          {t("successText", { number: done })}
        </p>
        <button
          type="button"
          className="btn-buy mt-8 w-auto min-w-[160px]"
          onClick={() => router.push("/")}
        >
          OK
        </button>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="card-surface p-10 text-center text-muted">
        Empty cart
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!city?.Ref) {
      setError(t("cityRequired"));
      return;
    }
    if (!warehouse?.Ref) {
      setError(t("warehouseRequired"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          customerEmail: email,
          paymentMethod: payment,
          comment,
          npCityRef: city.Ref,
          npCityName: city.Description,
          npWarehouseRef: warehouse.Ref,
          npWarehouseName: warehouse.Description,
          deliveryCost,
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.name,
            productSlug: i.slug,
            price: i.price,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order failed");

      if (data.paymentUrl) {
        clear();
        window.location.href = data.paymentUrl;
        return;
      }

      clear();
      setDone(data.orderNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <section className="card-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">{t("contact")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1.5 block text-muted">{t("name")}</span>
              <input
                required
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">{t("phone")}</span>
              <input
                required
                type="tel"
                className="input"
                placeholder="+380..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">{t("email")}</span>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
          </div>
        </section>

        <section className="card-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">{t("delivery")}</h2>
          <p className="mb-3 text-sm text-muted">{t("novaPoshta")}</p>
          {npDemo && (
            <p className="mb-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200/90">
              {t("npDemo")}
            </p>
          )}

          {/* City autocomplete */}
          <div ref={cityBoxRef} className="relative block text-sm">
            <span className="mb-1.5 block text-muted">{t("city")}</span>
            <input
              className="input"
              placeholder={t("cityPlaceholder")}
              value={city ? city.Description : cityQuery}
              onChange={(e) => {
                setCity(null);
                setWarehouse(null);
                setWarehouses([]);
                setWhQuery("");
                setCityQuery(e.target.value);
              }}
              onFocus={() => {
                if (!city && cities.length) setCitiesOpen(true);
              }}
              autoComplete="off"
              required
            />
            {citiesLoading && (
              <p className="mt-1 text-xs text-muted">{t("loadingCities")}</p>
            )}
            {citiesError && !citiesLoading && !city && cityQuery.length >= 2 && (
              <p className="mt-1 text-xs text-accent">{citiesError}</p>
            )}
            {citiesOpen && cities.length > 0 && !city && (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-line bg-[var(--surface-solid)] shadow-lift">
                {cities.map((c) => (
                  <li key={c.Ref}>
                    <button
                      type="button"
                      className="w-full px-3 py-2.5 text-left text-sm text-ink hover:bg-white/5"
                      onClick={() => selectCity(c)}
                    >
                      {c.Description}
                      {c.Area ? (
                        <span className="mt-0.5 block text-xs text-muted">
                          {c.Area}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Warehouse searchable select */}
          <div ref={whBoxRef} className="relative mt-4 block text-sm">
            <span className="mb-1.5 block text-muted">{t("warehouse")}</span>
            <input
              className="input"
              placeholder={
                city ? t("warehouseSearch") : t("selectCityFirst")
              }
              disabled={!city || whLoading}
              value={warehouse ? warehouse.Description : whQuery}
              onChange={(e) => {
                setWarehouse(null);
                setWhQuery(e.target.value);
                setWhOpen(true);
              }}
              onFocus={() => {
                if (city && warehouses.length) setWhOpen(true);
              }}
              autoComplete="off"
              required
            />
            {whLoading && (
              <p className="mt-1 text-xs text-muted">{t("loadingWarehouses")}</p>
            )}
            {whError && !whLoading && city && (
              <p className="mt-1 text-xs text-accent">{whError}</p>
            )}
            {whOpen && city && !whLoading && (
              <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-line bg-[var(--surface-solid)] shadow-lift">
                {filteredWarehouses.length === 0 ? (
                  <li className="px-3 py-3 text-sm text-muted">
                    {t("noWarehouses")}
                  </li>
                ) : (
                  filteredWarehouses.slice(0, 80).map((w) => (
                    <li key={w.Ref}>
                      <button
                        type="button"
                        className="w-full px-3 py-2.5 text-left text-sm text-ink hover:bg-white/5"
                        onClick={() => selectWarehouse(w)}
                      >
                        <span className="line-clamp-2">{w.Description}</span>
                        {w.Category &&
                        /postomat|поштомат/i.test(w.Category) ? (
                          <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted">
                            поштомат
                          </span>
                        ) : null}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
            {city && warehouses.length > 0 && !whLoading && (
              <p className="mt-1 text-[11px] text-muted">
                {warehouses.length} відділень / поштоматів
              </p>
            )}
          </div>
        </section>

        <section className="card-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">{t("payment")}</h2>
          <div className="space-y-2">
            {[
              ["cod", t("cod")],
              ["monobank", t("monobank")],
              ["liqpay", t("liqpay")],
              ["wayforpay", t("wayforpay")],
            ].map(([val, label]) => (
              <label
                key={val}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-sm has-[:checked]:border-ink has-[:checked]:bg-canvas"
              >
                <input
                  type="radio"
                  name="payment"
                  value={val}
                  checked={payment === val}
                  onChange={() => setPayment(val)}
                />
                {label}
              </label>
            ))}
          </div>
          <label className="mt-4 block text-sm">
            <span className="mb-1.5 block text-muted">{t("comment")}</span>
            <textarea
              className="input min-h-[80px]"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>
        </section>
      </div>

      <aside className="card-surface h-fit p-6">
        <ul className="mb-4 space-y-2 border-b border-line pb-4 text-sm">
          {items.map((i) => (
            <li key={i.productId} className="flex justify-between gap-2">
              <span className="text-muted">
                {i.name} × {i.quantity}
              </span>
              <span className="shrink-0 font-medium">
                {formatPrice(i.price * i.quantity, locale)}
              </span>
            </li>
          ))}
        </ul>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">{t("subtotal")}</span>
            <span>{formatPrice(cartTotal, locale)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t("deliveryCost")}</span>
            <span>
              {deliveryCost === 0 && city
                ? t("freeDelivery")
                : deliveryCost
                  ? formatPrice(deliveryCost, locale)
                  : "—"}
            </span>
          </div>
          {city && (
            <p className="text-[11px] leading-snug text-muted">
              {city.Description}
              {warehouse ? ` · ${warehouse.Description}` : ""}
            </p>
          )}
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
            <span>{t("orderTotal")}</span>
            <span>{formatPrice(grand, locale)}</span>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        <button type="submit" disabled={loading} className="btn-buy mt-6">
          {loading ? "…" : t("submit")}
        </button>
      </aside>
    </form>
  );
}
