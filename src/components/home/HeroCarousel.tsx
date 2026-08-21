"use client";

/**
 * Hero: pitch card | featured blog card (same 2-col slot as old simulator).
 * Simulator: header CTA + /simulator — not embedded here.
 */

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Headphones,
  Phone,
  RefreshCw,
  X,
} from "lucide-react";
import { HeroBrandMarquee } from "@/components/home/HeroBrandMarquee";
import { BlogCarousel } from "@/components/home/BlogCarousel";
import {
  STORE_PHONE_DISPLAY,
  STORE_PHONE_TEL,
  STORE_PHONE_TELEGRAM,
  STORE_PHONE_WHATSAPP,
} from "@/lib/contact";
import { trackConsultClick } from "@/lib/analytics/consult";
import { ConsultTrackLink } from "@/components/analytics/ConsultTrackLink";
import type { Brand } from "@/types";
import type { BlogPost } from "@/lib/blog/types";

type Props = {
  brands: Brand[];
  posts?: BlogPost[];
};

const CONSULT_MSG = encodeURIComponent(
  "Доброго дня! Потрібна консультація щодо оптики / тепловізора."
);

/** One red CTA → sheet: Telegram / WhatsApp / Call */
function ConsultButton() {
  const t = useTranslations("home");
  const [open, setOpen] = useState(false);
  const wa = `${STORE_PHONE_WHATSAPP}?text=${CONSULT_MSG}`;
  const tg = process.env.NEXT_PUBLIC_TELEGRAM_URL || STORE_PHONE_TELEGRAM;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          trackConsultClick("open_sheet", "hero");
          setOpen(true);
        }}
        className="btn-hero btn-hero-primary hero-mobile__btn min-w-0 flex-1 sm:flex-none sm:!min-h-[2.6rem] sm:!px-6 sm:!text-sm"
      >
        <span className="truncate sm:hidden">{t("heroSecondaryMobile")}</span>
        <span className="hidden truncate sm:inline">{t("heroSecondary")}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            aria-label={t("consultClose")}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("heroSecondary")}
            className="relative z-10 w-full max-w-sm rounded-t-2xl border border-white/10 bg-[var(--surface-solid,#16181d)] p-5 shadow-2xl sm:rounded-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-bold text-primary">
                  {t("consultSheetTitle")}
                </p>
                <p className="mt-1 text-xs text-secondary">
                  {t("consultSheetSub")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-muted-ui transition hover:bg-white/10 hover:text-primary"
                aria-label={t("consultClose")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-2.5">
              <ConsultTrackLink
                channel="telegram"
                source="hero"
                href={tg}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 transition hover:border-[var(--accent)]/50 hover:bg-white/[0.07]"
              >
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/telegram.png"
                    alt=""
                    className="h-6 w-6 object-contain"
                    width={24}
                    height={24}
                  />
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-sm font-semibold text-primary">
                    {t("consultTg")}
                  </span>
                  <span className="block text-xs text-secondary">
                    {t("consultTgHint")}
                  </span>
                </span>
              </ConsultTrackLink>
              <ConsultTrackLink
                channel="whatsapp"
                source="hero"
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 transition hover:border-[var(--accent)]/50 hover:bg-white/[0.07]"
              >
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/whatsapp.png"
                    alt=""
                    className="h-6 w-6 object-contain"
                    width={24}
                    height={24}
                  />
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-sm font-semibold text-primary">
                    {t("consultWa")}
                  </span>
                  <span className="block text-xs text-secondary">
                    {t("consultWaHint")}
                  </span>
                </span>
              </ConsultTrackLink>
              <ConsultTrackLink
                channel="phone"
                source="hero"
                href={STORE_PHONE_TEL}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 transition hover:border-[var(--accent)]/50 hover:bg-white/[0.07]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(225,29,42,0.18)] text-[var(--accent)]">
                  <Phone className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-sm font-semibold text-primary">
                    {t("consultCall")}
                  </span>
                  <span className="block text-xs text-secondary">
                    {STORE_PHONE_DISPLAY}
                  </span>
                </span>
              </ConsultTrackLink>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function HeroCarousel({ brands, posts = [] }: Props) {
  const t = useTranslations("home");
  const locale = useLocale();

  return (
    <section className="hero-section relative z-10 overflow-x-hidden py-3 sm:py-10 lg:py-14">
      <div className="container-shop !px-3 sm:!px-6">
        {/* Desktop: pitch | blog card (former simulator slot) */}
        <div className="grid items-stretch gap-3 lg:grid-cols-2 lg:gap-6">
          <div className="hero-glass hero-mobile relative z-10 flex h-full w-full max-w-full flex-col overflow-hidden rounded-[var(--radius-card)] px-3.5 py-3.5 sm:px-8 sm:py-9 lg:px-10 lg:py-11">
            <p className="hero-mobile__eyebrow mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-ui sm:mb-3 sm:text-[11px] sm:tracking-[0.2em] sm:text-xs">
              Professional Optics · Ukraine
            </p>

            <h1 className="hero-mobile__title font-display font-bold tracking-tight text-primary sm:hidden">
              {t("heroTitleMobile")}
            </h1>
            <h1 className="hidden font-display text-3xl font-bold leading-[1.15] tracking-tight text-primary sm:block lg:text-[2.15rem]">
              {t("heroTitle")}
            </h1>

            <p className="hero-mobile__sub mt-1.5 text-[0.75rem] leading-snug text-secondary sm:hidden">
              {t("heroSubtitleMobile")}
            </p>
            <p className="mt-3.5 hidden max-w-2xl text-[0.9375rem] leading-relaxed text-secondary sm:block sm:text-base">
              {t("heroSubtitle")}
            </p>

            <div className="hero-tradein mt-3 rounded-xl border border-[var(--accent)]/25 bg-[rgba(225,29,42,0.08)] px-3 py-2.5 sm:mt-5 sm:px-4 sm:py-3.5">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[rgba(225,29,42,0.18)] text-[var(--accent)] sm:h-9 sm:w-9">
                  <RefreshCw
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                    strokeWidth={2.25}
                  />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--accent)] sm:text-xs">
                    {t("heroTradeInTitle")}
                  </p>
                  <p className="mt-1 text-[0.7rem] leading-snug text-primary/95 sm:mt-1.5 sm:text-[0.9375rem] sm:leading-relaxed">
                    {t("heroTradeInBody")}
                  </p>
                </div>
              </div>
            </div>

            <div className="hero-mobile__cta mt-3 flex flex-row flex-wrap gap-1.5 sm:mt-6 sm:gap-2.5">
              <NextLink
                href="/catalog/teplovizori"
                className="btn-hero btn-hero-primary hero-mobile__btn min-w-0 flex-1 sm:flex-none sm:!min-h-[2.6rem] sm:!px-6 sm:!text-sm"
              >
                <span className="truncate sm:hidden">{t("heroCtaMobile")}</span>
                <span className="hidden truncate sm:inline">{t("heroCta")}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              </NextLink>
              <ConsultButton />
            </div>

            <ul className="hero-mobile__perks mt-3 grid grid-cols-2 gap-1 border-t border-white/[0.1] pt-2.5 sm:mt-6 sm:gap-3 sm:pt-5">
              <li className="hero-perk flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 sm:gap-2.5 sm:rounded-xl sm:px-3.5 sm:py-2.5">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-white/15 sm:h-9 sm:w-9">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/logos/nova-poshta.jpg"
                    alt="Нова Пошта"
                    className="h-full w-full object-contain p-0.5 sm:p-1"
                    width={36}
                    height={36}
                    loading="lazy"
                    decoding="async"
                  />
                </span>
                <span className="min-w-0 text-[9px] font-semibold leading-tight text-primary sm:text-sm sm:leading-snug">
                  {t("why2")}
                </span>
              </li>
              <li className="hero-perk flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 sm:gap-2.5 sm:rounded-xl sm:px-3.5 sm:py-2.5">
                <span className="hero-perk__icon flex h-6 w-6 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9">
                  <Headphones
                    className="h-3 w-3 sm:h-4 sm:w-4"
                    strokeWidth={1.75}
                  />
                </span>
                <span className="min-w-0 text-[9px] font-semibold leading-tight text-primary sm:text-sm sm:leading-snug">
                  {t("why3")}
                </span>
              </li>
            </ul>

            <HeroBrandMarquee
              brands={brands}
              title={t("heroTrustBrandsTitle")}
              className="hero-mobile__marquee mt-auto border-t border-white/[0.1] pt-2.5 sm:pt-5"
            />
          </div>

          {/* Featured article — same square column as old simulator */}
          <div className="relative min-h-0">
            <BlogCarousel posts={posts} locale={locale} />
          </div>
        </div>
      </div>
    </section>
  );
}
