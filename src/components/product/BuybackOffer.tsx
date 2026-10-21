"use client";

import { ArrowRight, Banknote, Camera, MapPin, Repeat } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { Locale } from "@/types";

const TEXT = {
  uk: {
    pill: "Викуп · Trade-in",
    title: "Є старий тепловізор? Обміняйте його на цей!",
    lead: "Зарахуємо вартість вашого приладу в ціну нового — ви доплачуєте лише різницю. Або просто викупимо за гроші.",
    chips: ["Оцінка по фото", "По всій Україні", "Гроші або обмін"],
    cta: "Оцінити свій прилад",
  },
  ru: {
    pill: "Выкуп · Trade-in",
    title: "Есть старый тепловизор? Обменяйте его на этот!",
    lead: "Зачтём стоимость вашего прибора в цену нового — вы доплачиваете только разницу. Или просто выкупим за деньги.",
    chips: ["Оценка по фото", "По всей Украине", "Деньги или обмен"],
    cta: "Оценить свой прибор",
  },
  en: {
    pill: "Buyback · Trade-in",
    title: "Have an old thermal imager? Trade it in for this one!",
    lead: "We count your device's value towards the new one — you pay only the difference. Or we simply buy it for cash.",
    chips: ["Appraisal from photos", "Across Ukraine", "Cash or trade-in"],
    cta: "Value my device",
  },
} as const;

const CHIP_ICONS = [Camera, MapPin, Repeat];

/**
 * Under the buy button of every product: the buyback page brings most of the
 * contacts (88 of 137 in 30 days, October 2026), so people looking at a new
 * device are offered to trade their old one in. Wording matches /vykup —
 * nothing it does not promise.
 */
export function BuybackOffer({ locale }: { locale: Locale }) {
  const t = TEXT[locale] ?? TEXT.uk;
  return (
    <aside className="buyback-offer mt-6" aria-label={t.pill}>
      <div className="buyback-offer__inner">
        <span className="buyback-offer__pill">
          <Banknote className="h-3.5 w-3.5" />
          {t.pill}
        </span>
        <p className="buyback-offer__title">{t.title}</p>
        <p className="buyback-offer__lead">{t.lead}</p>
        <ul className="buyback-offer__chips">
          {t.chips.map((c, i) => {
            const Icon = CHIP_ICONS[i];
            return (
              <li key={c}>
                <Icon className="h-3.5 w-3.5" />
                {c}
              </li>
            );
          })}
        </ul>
        <Link
          href="/vykup#ocinka"
          className="buyback-offer__cta"
          onClick={() => {
            void import("@vercel/analytics")
              .then((m) => m.track("buyback_cta", { source: "product" }))
              .catch(() => {});
          }}
        >
          {t.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}
