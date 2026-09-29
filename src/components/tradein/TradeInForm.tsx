"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, Phone, X } from "lucide-react";
import { CONDITIONS, DEFECTS, EXTRAS, MAX_PHOTOS, label } from "@/lib/trade-in";
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/contact";
import type { Locale } from "@/types";

interface Suggestion {
  slug: string;
  name: string;
  price: number;
  brand: string | null;
}

const T = {
  uk: {
    heading: "Оцінити прилад онлайн",
    lead: "Заповніть за дві хвилини — консультант побачить модель, стан і фото ще до дзвінка. Тому передзвонить уже з конкретною відповіддю щодо вашого приладу.",
    callInstead: "Не хочете заповнювати — просто телефонуйте",
    model: "Модель приладу",
    modelHint: "Почніть вводити назву — підкажемо зі свого каталогу",
    modelPlaceholder: "Наприклад: Pulsar Axion XQ38",
    newHere: "нова в нас",
    condition: "Стан",
    extras: "Що є в комплекті",
    defects: "Відомі дефекти",
    asking: "Скільки хочете отримати, грн",
    askingHint: "Назвіть свою суму. Консультант скаже, чи можемо її дати.",
    comment: "Що ще варто знати",
    commentPlaceholder: "Скільки користувалися, чи був ремонт, чому продаєте",
    photos: "Фото приладу",
    photosHint: `До ${MAX_PHOTOS} фото. Загальний вигляд, об'єктив, екран — за ними видно стан.`,
    addPhoto: "Додати фото",
    name: "Ім'я",
    phone: "Телефон",
    contactVia: "Як зручніше зв'язатися",
    submit: "Надіслати заявку",
    sending: "Надсилаємо…",
    okTitle: "Заявку прийнято",
    okText: "Консультант передзвонить найближчим часом. Якщо потрібно швидше — телефонуйте напряму.",
    again: "Надіслати ще одну",
    fail: "Не вдалося надіслати. Спробуйте ще раз або зателефонуйте нам.",
    required: "обов'язково",
  },
  ru: {
    heading: "Оценить прибор онлайн",
    lead: "Заполните за две минуты — консультант увидит модель, состояние и фото ещё до звонка. Поэтому перезвонит уже с конкретным ответом по вашему прибору.",
    callInstead: "Не хотите заполнять — просто звоните",
    model: "Модель прибора",
    modelHint: "Начните вводить название — подскажем из своего каталога",
    modelPlaceholder: "Например: Pulsar Axion XQ38",
    newHere: "новый у нас",
    condition: "Состояние",
    extras: "Что есть в комплекте",
    defects: "Известные дефекты",
    asking: "Сколько хотите получить, грн",
    askingHint: "Назовите свою сумму. Консультант скажет, можем ли мы её дать.",
    comment: "Что ещё стоит знать",
    commentPlaceholder: "Сколько пользовались, был ли ремонт, почему продаёте",
    photos: "Фото прибора",
    photosHint: `До ${MAX_PHOTOS} фото. Общий вид, объектив, экран — по ним видно состояние.`,
    addPhoto: "Добавить фото",
    name: "Имя",
    phone: "Телефон",
    contactVia: "Как удобнее связаться",
    submit: "Отправить заявку",
    sending: "Отправляем…",
    okTitle: "Заявка принята",
    okText: "Консультант перезвонит в ближайшее время. Если нужно быстрее — звоните напрямую.",
    again: "Отправить ещё одну",
    fail: "Не удалось отправить. Попробуйте ещё раз или позвоните нам.",
    required: "обязательно",
  },
} as const;

export function TradeInForm({ locale }: { locale: Locale }) {
  const t = T[locale];
  const [model, setModel] = useState("");
  const [picked, setPicked] = useState<Suggestion | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [openList, setOpenList] = useState(false);
  const [condition, setCondition] = useState<string>("good");
  const [extras, setExtras] = useState<string[]>([]);
  const [defects, setDefects] = useState<string[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  // Suggestions come from our own catalogue, so the consultant gets a slug
  // and the price of the same model new.
  useEffect(() => {
    const q = model.trim();
    if (picked && q === picked.name) return;
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/trade-in/models?q=${encodeURIComponent(q)}&locale=${locale}`,
        );
        const data = await res.json();
        setSuggestions(data.items || []);
        setOpenList(true);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [model, locale, picked]);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  function toggle(list: string[], set: (v: string[]) => void, key: string) {
    set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next = [...photos, ...Array.from(list)].slice(0, MAX_PHOTOS);
    setPhotos(next);
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setErrors({});

    const form = new FormData(e.currentTarget);
    form.set("model", model);
    form.set("condition", condition);
    if (picked) {
      form.set("productSlug", picked.slug);
      form.set("newPrice", String(picked.price));
    }
    extras.forEach((v) => form.append("extras", v));
    defects.forEach((v) => form.append("defects", v));
    photos.forEach((f) => form.append("photos", f));

    try {
      const res = await fetch("/api/trade-in", { method: "POST", body: form });
      if (res.ok) {
        setDone(true);
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
      <section className="mt-8 rounded-[var(--radius-card)] border border-white/10 bg-white/[0.02] p-8 text-center">
        <Check className="mx-auto h-10 w-10 text-[var(--accent)]" strokeWidth={2} />
        <h2 className="mt-3 font-display text-xl font-bold text-primary">{t.okTitle}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-secondary">
          {t.okText}
        </p>
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
              setPicked(null);
              setPhotos([]);
              setExtras([]);
              setDefects([]);
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

  return (
    <section className="mt-8 rounded-[var(--radius-card)] border border-white/10 bg-white/[0.02] p-6 sm:p-8">
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

        <div className="relative">
          <label className="mb-1.5 block text-sm font-semibold text-primary">
            {t.model} <span className="text-[var(--accent)]">*</span>
          </label>
          <input
            className="input"
            value={model}
            placeholder={t.modelPlaceholder}
            onChange={(e) => {
              setModel(e.target.value);
              setPicked(null);
            }}
            onFocus={() => suggestions.length && setOpenList(true)}
            onBlur={() => setTimeout(() => setOpenList(false), 150)}
            autoComplete="off"
          />
          <p className="mt-1 text-xs text-muted-ui">{t.modelHint}</p>
          {errors.model && <p className="mt-1 text-xs text-[var(--accent)]">{errors.model}</p>}

          {openList && suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-white/15 bg-[#12141a] shadow-xl">
              {suggestions.map((s) => (
                <li key={s.slug}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-white/[0.06]"
                    onClick={() => {
                      setModel(s.name);
                      setPicked(s);
                      setOpenList(false);
                    }}
                  >
                    <span className="text-primary">{s.name}</span>
                    <span className="shrink-0 text-xs text-muted-ui">
                      {new Intl.NumberFormat("uk-UA").format(s.price)} грн
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {picked && (
            <p className="mt-1.5 text-xs text-muted-ui">
              {t.newHere}: {new Intl.NumberFormat("uk-UA").format(picked.price)} грн
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-primary">
            {t.condition} <span className="text-[var(--accent)]">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                className={chip(condition === c)}
                onClick={() => setCondition(c)}
              >
                {label(c, locale)}
              </button>
            ))}
          </div>
          {errors.condition && (
            <p className="mt-1 text-xs text-[var(--accent)]">{errors.condition}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-primary">{t.extras}</label>
          <div className="flex flex-wrap gap-2">
            {EXTRAS.map((x) => (
              <button
                key={x}
                type="button"
                className={chip(extras.includes(x))}
                onClick={() => toggle(extras, setExtras, x)}
              >
                {label(x, locale)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-primary">{t.defects}</label>
          <div className="flex flex-wrap gap-2">
            {DEFECTS.map((d) => (
              <button
                key={d}
                type="button"
                className={chip(defects.includes(d))}
                onClick={() => toggle(defects, setDefects, d)}
              >
                {label(d, locale)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-primary">{t.asking}</label>
          <input
            className="input"
            name="askingPrice"
            inputMode="numeric"
            placeholder="45000"
          />
          <p className="mt-1 text-xs text-muted-ui">{t.askingHint}</p>
          {errors.askingPrice && (
            <p className="mt-1 text-xs text-[var(--accent)]">{errors.askingPrice}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-primary">{t.photos}</label>
          <div className="flex flex-wrap items-center gap-3">
            {previews.map((src, i) => (
              <div key={src} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="h-20 w-20 rounded-lg border border-white/15 object-cover"
                />
                <button
                  type="button"
                  aria-label="×"
                  onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  className="absolute -right-2 -top-2 rounded-full border border-white/20 bg-[#12141a] p-1 text-secondary hover:text-primary"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/20 text-xs text-secondary hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <Camera className="h-5 w-5" />
                {t.addPhoto}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-ui">{t.photosHint}</p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-primary">{t.comment}</label>
          <textarea
            className="input min-h-[90px]"
            name="comment"
            rows={3}
            placeholder={t.commentPlaceholder}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-primary">
              {t.name} <span className="text-[var(--accent)]">*</span>
            </label>
            <input className="input" name="name" autoComplete="name" />
            {errors.name && <p className="mt-1 text-xs text-[var(--accent)]">{errors.name}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-primary">
              {t.phone} <span className="text-[var(--accent)]">*</span>
            </label>
            <input
              className="input"
              name="phone"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0XX XXX XX XX"
            />
            {errors.phone && <p className="mt-1 text-xs text-[var(--accent)]">{errors.phone}</p>}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-semibold text-primary">{t.contactVia}</label>
          <div className="flex flex-wrap gap-2">
            {["Телефон", "Telegram", "Viber", "WhatsApp"].map((c) => (
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
