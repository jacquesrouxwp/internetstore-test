"use client";

/**
 * "Подробнее" popover for the simulator disclaimer.
 *
 * Desktop (hover-capable pointer): opens on hover and on keyboard focus.
 * Touch: hover never fires, so the button toggles it on tap — the same button
 * therefore has to work as a real control, not a hover affordance.
 *
 * Dismissed by Escape or a click outside, so it can never trap the page.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  isRu?: boolean;
  className?: string;
};

type Copy = {
  trigger: string;
  title: string;
  close: string;
  howTitle: string;
  how: string[];
  purposeTitle: string;
  purpose: string;
  limitsTitle: string;
  limits: string[];
  consultTitle: string;
  consult: string;
};

const RU: Copy = {
  trigger: "Подробнее",
  title: "Как работает этот симулятор",
  close: "Закрыть",
  howTitle: "Как считается картинка",
  how: [
    "Расчёт идёт по критерию Джонсона — стандарту, по которому производители заявляют дальность. Ключевая формула: число пикселей на цели = размер цели × фокус ÷ (шаг пикселя × дистанция). Порог обнаружения — 2 пикселя, распознавания — 8, идентификации — 13.",
    "Объектив и шаг пикселя задают IFOV — угол, который «видит» один детектор. Чем длиннее объектив и мельче пиксель, тем детальнее картинка; матрица ограничивает это сверху. Дистанция сетку не меняет — она уменьшает цель внутри неё. NETD добавляет шум, атмосфера съедает контраст с расстоянием.",
  ],
  purposeTitle: "Для чего он",
  purpose:
    "Это наглядная иллюстрация принципа, а не расчёт под вашу задачу. Он помогает на пальцах почувствовать, как связаны объектив, матрица, пиксель и дистанция, и с чем связана разница в цене между моделями. Не более того.",
  limitsTitle: "Чего ждать не стоит",
  limits: [
    "Это упрощённая модель, а не фотография с конкретного прибора. Реальная картинка зависит от обработки изображения производителя, качества стекла и настроек.",
    "Размер оленя на экране намеренно зафиксирован для наглядности сравнения — в реальности кадр будет выглядеть иначе.",
    "Не учитываются дождь, снег, марево, температура цели и фона, рельеф, растительность и опыт наблюдателя.",
    "Совпадение с поведением конкретной модели в поле не гарантируется.",
  ],
  consultTitle: "Перед покупкой посоветуйтесь с нашими специалистами",
  consult:
    "Симулятор не подбирает прибор за вас: подходящую модель под ваши задачи, дистанции и бюджет поможет определить только консультант. Напишите нам в мессенджер или позвоните — подскажем по вашей конкретной ситуации.",
};

const UK: Copy = {
  trigger: "Детальніше",
  title: "Як працює цей симулятор",
  close: "Закрити",
  howTitle: "Як рахується зображення",
  how: [
    "Розрахунок іде за критерієм Джонсона — стандартом, за яким виробники заявляють дальність. Ключова формула: кількість пікселів на цілі = розмір цілі × фокус ÷ (крок пікселя × дистанція). Поріг виявлення — 2 пікселі, розпізнавання — 8, ідентифікації — 13.",
    "Об'єктив і крок пікселя задають IFOV — кут, який «бачить» один детектор. Що довший об'єктив і дрібніший піксель, то детальніша картинка; матриця обмежує це зверху. Дистанція сітку не змінює — вона зменшує ціль усередині неї. NETD додає шум, атмосфера з'їдає контраст із відстанню.",
  ],
  purposeTitle: "Для чого він",
  purpose:
    "Це наочна ілюстрація принципу, а не розрахунок під ваше завдання. Він допомагає на пальцях відчути, як пов'язані об'єктив, матриця, піксель і дистанція, та з чим пов'язана різниця в ціні між моделями. Не більше того.",
  limitsTitle: "Чого не варто очікувати",
  limits: [
    "Це спрощена модель, а не фотографія з конкретного приладу. Реальна картинка залежить від обробки зображення виробника, якості скла та налаштувань.",
    "Розмір оленя на екрані навмисно зафіксовано для наочності порівняння — у реальності кадр виглядатиме інакше.",
    "Не враховуються дощ, сніг, марево, температура цілі та фону, рельєф, рослинність і досвід спостерігача.",
    "Збіг із поведінкою конкретної моделі в полі не гарантується.",
  ],
  consultTitle: "Перед покупкою порадьтеся з нашими фахівцями",
  consult:
    "Симулятор не підбирає прилад за вас: відповідну модель під ваші завдання, дистанції та бюджет допоможе визначити лише консультант. Напишіть нам у месенджер або зателефонуйте — підкажемо у вашій конкретній ситуації.",
};

export function SimulatorInfoPopover({ isRu = false, className }: Props) {
  const t = isRu ? RU : UK;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  // Hover only where hovering is real; on touch the button must be tapped.
  const canHover = useCallback(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(hover: hover) and (pointer: fine)").matches,
    []
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className={cn("relative shrink-0", className)}
      onMouseEnter={() => canHover() && setOpen(true)}
      onMouseLeave={() => canHover() && setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => canHover() && setOpen(true)}
        className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-amber-300/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-100 transition hover:border-amber-300/70 hover:bg-amber-400/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70"
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
        {t.trigger}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t.title}
          className="absolute right-0 z-50 mt-2 max-h-[70vh] w-[min(26rem,calc(100vw-3rem))] overflow-y-auto overscroll-contain rounded-xl border border-white/12 p-4 text-left shadow-2xl"
          style={{ background: "#12141a" }}
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <h3 className="text-sm font-bold text-primary">{t.title}</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.close}
              className="-mr-1 -mt-1 rounded-md p-1 text-muted-ui transition hover:bg-white/10 hover:text-primary"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <Section title={t.howTitle}>
            {t.how.map((p, i) => (
              <p key={i} className={i ? "mt-2" : undefined}>
                {p}
              </p>
            ))}
          </Section>

          <Section title={t.purposeTitle}>
            <p>{t.purpose}</p>
          </Section>

          <Section title={t.limitsTitle}>
            <ul className="space-y-1.5">
              {t.limits.map((li, i) => (
                <li key={i} className="flex gap-2">
                  <span aria-hidden className="text-amber-300/70">
                    •
                  </span>
                  <span>{li}</span>
                </li>
              ))}
            </ul>
          </Section>

          <div className="mt-3 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3">
            <p className="text-xs font-bold text-amber-200">
              {t.consultTitle}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-100/90">
              {t.consult}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-ui">
        {title}
      </p>
      <div className="text-xs leading-relaxed text-secondary">{children}</div>
    </div>
  );
}
