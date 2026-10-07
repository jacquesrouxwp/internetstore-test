"use client";

import { useState } from "react";
import { Check, Loader2, Phone } from "lucide-react";
import {
  CATEGORY_LABEL,
  PREMIUM_BRANDS,
  PREMIUM_BRANDS_US,
  PREMIUM_CATEGORIES,
  type PremiumCategory,
} from "@/lib/premium-order";
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/contact";
import type { Locale } from "@/types";

const T = {
  uk: {
    heading: "Замовити прилад",
    lead: "Напишіть, яку модель шукаєте. Консультант знайде її, назве ціну й термін постачання та зв'яжеться з вами — без передоплати на цьому етапі.",
    callInstead: "Зручніше голосом — телефонуйте",
    category: "Що шукаєте",
    brand: "Бренд",
    brandPlaceholder: "Наприклад: Swarovski Optik",
    model: "Модель або що саме потрібно",
    modelPlaceholder: "Наприклад: бінокль 10x42 з далекоміром",
    modelHint: "Якщо точної моделі не знаєте — опишіть задачу, підберемо.",
    budget: "Бюджет, грн",
    budgetHint: "Необов'язково, але так консультант одразу запропонує доречні варіанти.",
    comment: "Коментар",
    commentPlaceholder: "Для чого прилад, коли потрібен, чи важлива комплектація",
    name: "Ім'я",
    phone: "Телефон",
    contactVia: "Як зручніше зв'язатися",
    submit: "Надіслати заявку",
    sending: "Надсилаємо…",
    okTitle: "Заявку прийнято",
    okText: "Консультант зв'яжеться з вами, щойно уточнить наявність, ціну й термін постачання.",
    again: "Надіслати ще одну",
    fail: "Не вдалося надіслати. Спробуйте ще раз або зателефонуйте нам.",
  },
  ru: {
    heading: "Заказать прибор",
    lead: "Напишите, какую модель ищете. Консультант найдёт её, назовёт цену и срок поставки и свяжется с вами — без предоплаты на этом этапе.",
    callInstead: "Удобнее голосом — звоните",
    category: "Что ищете",
    brand: "Бренд",
    brandPlaceholder: "Например: Swarovski Optik",
    model: "Модель или что именно нужно",
    modelPlaceholder: "Например: бинокль 10x42 с дальномером",
    modelHint: "Если точной модели не знаете — опишите задачу, подберём.",
    budget: "Бюджет, грн",
    budgetHint: "Необязательно, но так консультант сразу предложит подходящие варианты.",
    comment: "Комментарий",
    commentPlaceholder: "Для чего прибор, когда нужен, важна ли комплектация",
    name: "Имя",
    phone: "Телефон",
    contactVia: "Как удобнее связаться",
    submit: "Отправить заявку",
    sending: "Отправляем…",
    okTitle: "Заявка принята",
    okText: "Консультант свяжется с вами, как только уточнит наличие, цену и срок поставки.",
    again: "Отправить ещё одну",
    fail: "Не удалось отправить. Попробуйте ещё раз или позвоните нам.",
  },
  en: {
    heading: "Order a device",
    lead: "Tell us which model you are after. A consultant sources it, names the price and the delivery time and gets back to you — no prepayment at this stage.",
    callInstead: "Not everyone on our phone line speaks English, so the form is the surest route — an English-speaking colleague picks it up. You can still call",
    category: "What you are looking for",
    brand: "Brand",
    brandPlaceholder: "For example: Swarovski Optik",
    model: "Model, or what exactly you need",
    modelPlaceholder: "For example: 10x42 rangefinding binoculars",
    modelHint: "If you do not know the exact model, describe the task and we will suggest one.",
    budget: "Budget, UAH",
    budgetHint: "Optional, but it lets the consultant suggest the right options straight away.",
    comment: "Comment",
    commentPlaceholder: "What the device is for, when you need it, whether the kit matters",
    name: "Name",
    phone: "Phone",
    contactVia: "Best way to reach you",
    submit: "Send request",
    sending: "Sending…",
    okTitle: "Request received",
    okText: "A consultant will get back to you once availability, price and delivery time are confirmed.",
    again: "Send another one",
    fail: "Could not send. Please try again or give us a call.",
  },
} as const;

const ALL_BRANDS = [...PREMIUM_BRANDS.map((b) => b.name), ...PREMIUM_BRANDS_US];

export function PremiumOrderForm({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [category, setCategory] = useState<PremiumCategory | "">("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setErrors({});
    const form = new FormData(e.currentTarget);
    const body = {
      category,
      brand: String(form.get("brand") || ""),
      model: String(form.get("model") || ""),
      budget: String(form.get("budget") || ""),
      comment: String(form.get("comment") || ""),
      name: String(form.get("name") || ""),
      phone: String(form.get("phone") || ""),
      contactVia: String(form.get("contactVia") || ""),
      website: String(form.get("website") || ""),
      locale,
    };
    try {
      const res = await fetch("/api/premium-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setDone(true);
        // The long form collapses into a short message; without this the
        // visitor is left looking at empty space below it.
        requestAnimationFrame(() =>
          document.getElementById("order")?.scrollIntoView({ block: "start", behavior: "smooth" }),
        );
      } else {
        const data = await res.json().catch(() => ({}));
        setErrors(data.errors || { _: data.error || t.fail });
      }
    } catch {
      setErrors({ _: t.fail });
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <section
        id="order"
        className="mt-8 scroll-mt-24 rounded-[var(--radius-card)] border border-white/10 bg-white/[0.02] p-8 text-center"
      >
        <Check className="mx-auto h-10 w-10 text-[var(--accent)]" strokeWidth={2} />
        <h2 className="mt-3 font-display text-xl font-bold text-primary">{t.okTitle}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-secondary">{t.okText}</p>
        <a
          href={STORE_PHONE_TEL}
          className="mt-4 inline-flex items-center gap-2 font-semibold text-[var(--accent)] hover:underline"
        >
          <Phone className="h-4 w-4" /> {STORE_PHONE_DISPLAY}
        </a>
        <div className="mt-5">
          <button
            type="button"
            onClick={() => {
              setDone(false);
              setCategory("");
            }}
            className="text-sm text-secondary underline hover:text-primary"
          >
            {t.again}
          </button>
        </div>
      </section>
    );
  }

  const chip = (active: boolean) =>
    `rounded-lg border px-3 py-1.5 text-sm transition ${
      active
        ? "border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-[var(--accent)]"
        : "border-white/15 text-secondary hover:border-white/30 hover:text-primary"
    }`;
  const err = (k: string) =>
    errors[k] ? <p className="mt-1 text-xs text-[var(--accent)]">{errors[k]}</p> : null;

  return (
    <section
      id="order"
      className="mt-8 scroll-mt-24 rounded-[var(--radius-card)] border border-white/10 bg-white/[0.02] p-6 sm:p-8"
    >
      <h2 className="font-display text-xl font-bold text-primary">{t.heading}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">{t.lead}</p>
      <p className="mt-1.5 text-sm text-secondary">
        {t.callInstead}{" "}
        <a href={STORE_PHONE_TEL} className="font-semibold text-[var(--accent)] hover:underline">
          {STORE_PHONE_DISPLAY}
        </a>
        .
      </p>

      <form onSubmit={submit} className="mt-6 grid gap-5" noValidate>
        {/* honeypot — hidden from people, irresistible to bots */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-primary">
            {t.category} <span className="text-[var(--accent)]">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {PREMIUM_CATEGORIES.map((c) => (
              <button key={c} type="button" className={chip(category === c)} onClick={() => setCategory(c)}>
                {CATEGORY_LABEL[c][locale]}
              </button>
            ))}
          </div>
          {err("category")}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-primary">{t.brand}</label>
            <input
              className="input"
              name="brand"
              list="premium-brands"
              placeholder={t.brandPlaceholder}
              autoComplete="off"
            />
            <datalist id="premium-brands">
              {ALL_BRANDS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-primary">{t.budget}</label>
            <input className="input" name="budget" inputMode="numeric" placeholder="150000" />
            <p className="mt-1 text-xs text-muted-ui">{t.budgetHint}</p>
            {err("budget")}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-primary">
            {t.model} <span className="text-[var(--accent)]">*</span>
          </label>
          <input className="input" name="model" placeholder={t.modelPlaceholder} autoComplete="off" />
          <p className="mt-1 text-xs text-muted-ui">{t.modelHint}</p>
          {err("model")}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-primary">{t.comment}</label>
          <textarea className="input min-h-[90px]" name="comment" rows={3} placeholder={t.commentPlaceholder} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-primary">
              {t.name} <span className="text-[var(--accent)]">*</span>
            </label>
            <input className="input" name="name" autoComplete="name" />
            {err("name")}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-primary">
              {t.phone} <span className="text-[var(--accent)]">*</span>
            </label>
            <input className="input" name="phone" inputMode="tel" autoComplete="tel" placeholder="0XX XXX XX XX" />
            {err("phone")}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-primary">{t.contactVia}</label>
          <div className="flex flex-wrap gap-2">
            {[locale === "en" ? "Phone" : "Телефон", "Telegram", "Viber", "WhatsApp"].map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="contactVia" value={c} className="peer sr-only" />
                <span className="inline-block rounded-lg border border-white/15 px-3 py-1.5 text-sm text-secondary transition peer-checked:border-[var(--accent)] peer-checked:font-semibold peer-checked:text-[var(--accent)]">
                  {c}
                </span>
              </label>
            ))}
          </div>
        </div>

        {errors._ && <p className="text-sm text-[var(--accent)]">{errors._}</p>}

        <div>
          <button type="submit" disabled={sending} className="btn-buy w-full sm:w-auto">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t.sending}
              </>
            ) : (
              t.submit
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
