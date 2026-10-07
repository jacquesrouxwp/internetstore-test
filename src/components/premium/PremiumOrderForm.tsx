"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Phone } from "lucide-react";
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/contact";
import type { Locale } from "@/types";

/** Fired by the brand list when a visitor clicks a model. */
export const PICK_EVENT = "premium-pick";

const T = {
  uk: {
    heading: "Яку модель шукаєте?",
    lead: "Напишіть модель — наш співробітник зв'яжеться з вами.",
    model: "Модель",
    modelPlaceholder: "Наприклад: Swarovski NL Pure 10x42",
    modelHint: "Або оберіть модель у списку брендів нижче.",
    name: "Ім'я",
    phone: "Телефон",
    submit: "Надіслати заявку",
    sending: "Надсилаємо…",
    okTitle: "Заявку прийнято",
    okText: "Наш співробітник зв'яжеться з вами найближчим часом.",
    again: "Надіслати ще одну",
    fail: "Не вдалося надіслати. Спробуйте ще раз або зателефонуйте нам.",
    orCall: "Або телефонуйте:",
  },
  ru: {
    heading: "Какую модель ищете?",
    lead: "Напишите модель — наш сотрудник свяжется с вами.",
    model: "Модель",
    modelPlaceholder: "Например: Swarovski NL Pure 10x42",
    modelHint: "Или выберите модель в списке брендов ниже.",
    name: "Имя",
    phone: "Телефон",
    submit: "Отправить заявку",
    sending: "Отправляем…",
    okTitle: "Заявка принята",
    okText: "Наш сотрудник свяжется с вами в ближайшее время.",
    again: "Отправить ещё одну",
    fail: "Не удалось отправить. Попробуйте ещё раз или позвоните нам.",
    orCall: "Или звоните:",
  },
  en: {
    heading: "Which model are you looking for?",
    lead: "Name the model — a colleague will get back to you. Not everyone on our phone line speaks English, so the form is the surest route.",
    model: "Model",
    modelPlaceholder: "For example: Swarovski NL Pure 10x42",
    modelHint: "Or pick a model from the brand list below.",
    name: "Name",
    phone: "Phone",
    submit: "Send request",
    sending: "Sending…",
    okTitle: "Request received",
    okText: "A colleague will get back to you shortly.",
    again: "Send another one",
    fail: "Could not send. Please try again or give us a call.",
    orCall: "Or call:",
  },
} as const;

export function PremiumOrderForm({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [model, setModel] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);

  // A model clicked in the brand list lands here, and the visitor is taken
  // straight to the next empty field.
  useEffect(() => {
    const onPick = (e: Event) => {
      const picked = (e as CustomEvent<string>).detail;
      if (!picked) return;
      setDone(false);
      setModel(picked);
      setErrors({});
      document.getElementById("order")?.scrollIntoView({ block: "start", behavior: "smooth" });
      setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 400);
    };
    window.addEventListener(PICK_EVENT, onPick);
    return () => window.removeEventListener(PICK_EVENT, onPick);
  }, []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setErrors({});
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/premium-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          name: String(form.get("name") || ""),
          phone: String(form.get("phone") || ""),
          website: String(form.get("website") || ""),
          locale,
        }),
      });
      if (res.ok) {
        setDone(true);
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

  const box = "scroll-mt-24 rounded-[var(--radius-card)] border border-[var(--accent)]/30 bg-white/[0.03] p-6 sm:p-8";

  if (done) {
    return (
      <section id="order" className={`${box} text-center`}>
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
              setModel("");
            }}
            className="text-sm text-secondary underline hover:text-primary"
          >
            {t.again}
          </button>
        </div>
      </section>
    );
  }

  const err = (k: string) =>
    errors[k] ? <p className="mt-1 text-xs text-[var(--accent)]">{errors[k]}</p> : null;

  return (
    <section id="order" className={box}>
      <h2 className="font-display text-xl font-bold text-primary">{t.heading}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">{t.lead}</p>

      <form onSubmit={submit} className="mt-5 grid gap-4" noValidate>
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
            {t.model} <span className="text-[var(--accent)]">*</span>
          </label>
          <input
            className="input"
            name="model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={t.modelPlaceholder}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-muted-ui">{t.modelHint}</p>
          {err("model")}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-primary">
              {t.name} <span className="text-[var(--accent)]">*</span>
            </label>
            <input ref={nameRef} className="input" name="name" autoComplete="name" />
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

        {errors._ && <p className="text-sm text-[var(--accent)]">{errors._}</p>}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <button type="submit" disabled={sending} className="btn-buy w-full sm:w-auto">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t.sending}
              </>
            ) : (
              t.submit
            )}
          </button>
          <span className="text-sm text-secondary">
            {t.orCall}{" "}
            <a href={STORE_PHONE_TEL} className="font-semibold text-[var(--accent)] hover:underline">
              {STORE_PHONE_DISPLAY}
            </a>
          </span>
        </div>
      </form>
    </section>
  );
}
