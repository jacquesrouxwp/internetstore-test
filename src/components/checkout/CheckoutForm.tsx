"use client";

import { useCart } from "@/lib/cart-store";
import { useLocale, useTranslations } from "next-intl";
import { formatPrice } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/i18n/routing";

type City = { Ref: string; Description: string };
type Warehouse = { Ref: string; Description: string };

export function CheckoutForm() {
  const t = useTranslations("checkout");
  const locale = useLocale();
  const router = useRouter();
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total);
  const clear = useCart((s) => s.clear);
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [payment, setPayment] = useState("cod");
  const [cityQuery, setCityQuery] = useState("");
  const [cities, setCities] = useState<City[]>([]);
  const [city, setCity] = useState<City | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (cityQuery.length < 2) {
      setCities([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(
        `/api/nova-poshta?action=cities&q=${encodeURIComponent(cityQuery)}`
      );
      const data = await res.json();
      setCities(data.cities || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  useEffect(() => {
    if (!city) return;
    (async () => {
      const res = await fetch(
        `/api/nova-poshta?action=warehouses&cityRef=${city.Ref}`
      );
      const data = await res.json();
      setWarehouses(data.warehouses || []);
      setWarehouse(null);
      const costRes = await fetch(
        `/api/nova-poshta?action=cost&cityRef=${city.Ref}&weight=1&price=${total()}`
      );
      const costData = await costRes.json();
      setDeliveryCost(Number(costData.cost || 0));
    })();
  }, [city, total]);

  const grand = useMemo(() => total() + deliveryCost, [total, deliveryCost]);

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
          className="btn-primary mt-8"
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
          npCityRef: city?.Ref,
          npCityName: city?.Description,
          npWarehouseRef: warehouse?.Ref,
          npWarehouseName: warehouse?.Description,
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
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-muted">{t("email")}</span>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="card-surface p-6">
          <h2 className="mb-4 text-lg font-semibold">{t("delivery")}</h2>
          <p className="mb-3 text-sm text-muted">{t("novaPoshta")}</p>
          <label className="relative block text-sm">
            <span className="mb-1.5 block text-muted">{t("city")}</span>
            <input
              className="input"
              placeholder={t("cityPlaceholder")}
              value={city ? city.Description : cityQuery}
              onChange={(e) => {
                setCity(null);
                setCityQuery(e.target.value);
              }}
            />
            {cities.length > 0 && !city && (
              <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-line bg-white shadow-lift">
                {cities.map((c) => (
                  <li key={c.Ref}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-canvas"
                      onClick={() => {
                        setCity(c);
                        setCityQuery("");
                        setCities([]);
                      }}
                    >
                      {c.Description}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>
          <label className="mt-4 block text-sm">
            <span className="mb-1.5 block text-muted">{t("warehouse")}</span>
            <select
              className="input"
              disabled={!city}
              value={warehouse?.Ref || ""}
              onChange={(e) => {
                const w = warehouses.find((x) => x.Ref === e.target.value);
                setWarehouse(w || null);
              }}
            >
              <option value="">{t("warehousePlaceholder")}</option>
              {warehouses.map((w) => (
                <option key={w.Ref} value={w.Ref}>
                  {w.Description}
                </option>
              ))}
            </select>
          </label>
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
            <span>{formatPrice(total(), locale)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">{t("deliveryCost")}</span>
            <span>
              {deliveryCost
                ? formatPrice(deliveryCost, locale)
                : "—"}
            </span>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
            <span>{t("orderTotal")}</span>
            <span>{formatPrice(grand, locale)}</span>
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary mt-6 w-full"
        >
          {loading ? "…" : t("submit")}
        </button>
      </aside>
    </form>
  );
}
