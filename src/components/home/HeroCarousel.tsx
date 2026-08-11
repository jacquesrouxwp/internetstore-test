"use client";

/**
 * Hero: pitch card + thermal simulator.
 * Desktop: two columns (pitch | sim).
 * Mobile: horizontal swipe pitch → sim.
 */

import { useCallback, useRef, useState } from "react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronLeft, ChevronRight, Headphones } from "lucide-react";
import { HeroBrandMarquee } from "@/components/home/HeroBrandMarquee";
import { ThermalSandbox } from "@/components/simulator/ThermalSandbox";
import { BrandMark } from "@/components/ui/BrandMark";
import {
  STORE_PHONE_TELEGRAM,
  STORE_PHONE_WHATSAPP,
} from "@/lib/contact";
import type { Brand } from "@/types";
import type { ThermalCompareOption } from "@/lib/thermal/parse-product-thermal";
import { cn } from "@/lib/utils";

type Props = {
  brands: Brand[];
  locale: string;
  presets: ThermalCompareOption[];
};

const CONSULT_MSG = encodeURIComponent(
  "Доброго дня! Потрібна консультація щодо оптики / тепловізора."
);

function ConsultMessengers({ className }: { className?: string }) {
  const t = useTranslations("home");
  const wa = `${STORE_PHONE_WHATSAPP}?text=${CONSULT_MSG}`;
  const tg = process.env.NEXT_PUBLIC_TELEGRAM_URL || STORE_PHONE_TELEGRAM;

  return (
    <div className={cn("flex min-w-0 flex-1 gap-1.5 sm:flex-none", className)}>
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-hero btn-hero-secondary hero-mobile__btn inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 !border-[#25d366]/40 sm:flex-none sm:!min-h-[2.6rem] sm:!px-4 sm:!text-sm"
        title="WhatsApp"
      >
        <BrandMark brand="whatsapp" size="sm" />
        <span className="truncate text-[11px] sm:text-sm">
          {t("consultWa")}
        </span>
      </a>
      <a
        href={tg}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-hero btn-hero-secondary hero-mobile__btn inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 !border-[#229ed9]/40 sm:flex-none sm:!min-h-[2.6rem] sm:!px-4 sm:!text-sm"
        title="Telegram"
      >
        <BrandMark brand="telegram" size="sm" />
        <span className="truncate text-[11px] sm:text-sm">
          {t("consultTg")}
        </span>
      </a>
    </div>
  );
}

function PitchCard({ brands }: { brands: Brand[] }) {
  const t = useTranslations("home");

  return (
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

      <div className="hero-mobile__cta mt-3 flex flex-row flex-wrap gap-1.5 sm:mt-7 sm:gap-2.5">
        <NextLink
          href="/catalog/teplovizori"
          className="btn-hero btn-hero-primary hero-mobile__btn min-w-0 flex-1 sm:flex-none sm:!min-h-[2.6rem] sm:!px-6 sm:!text-sm"
        >
          <span className="truncate sm:hidden">{t("heroCtaMobile")}</span>
          <span className="hidden truncate sm:inline">{t("heroCta")}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
        </NextLink>
        <ConsultMessengers />
      </div>

      <ul className="hero-mobile__perks mt-3 grid grid-cols-2 gap-1 border-t border-white/[0.1] pt-2.5 sm:mt-7 sm:gap-3 sm:pt-5">
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
            <Headphones className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 text-[9px] font-semibold leading-tight text-primary sm:text-sm sm:leading-snug">
            {t("why3")}
          </span>
        </li>
      </ul>

      <HeroBrandMarquee
        brands={brands}
        title={t("heroTrustBrandsTitle")}
        className="hero-mobile__marquee mt-2.5 border-t border-white/[0.1] pt-2.5 sm:mt-6 sm:pt-5"
      />
    </div>
  );
}

function SimPanel({
  locale,
  presets,
  className,
}: {
  locale: string;
  presets: ThermalCompareOption[];
  className?: string;
}) {
  const t = useTranslations("home");
  return (
    <div
      className={cn(
        "hero-glass relative z-10 flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[var(--radius-card)]",
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 sm:px-4 sm:py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-ui sm:text-xs">
          {t("heroSandbox")}
        </p>
        <NextLink
          href="/simulator"
          className="text-[11px] font-medium text-[var(--accent)] hover:underline sm:text-xs"
        >
          {t("heroSandboxFull")}
        </NextLink>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3">
        <ThermalSandbox locale={locale} catalogPresets={presets} />
      </div>
    </div>
  );
}

export function HeroCarousel({ brands, locale, presets }: Props) {
  const t = useTranslations("home");
  const [slide, setSlide] = useState(0);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const locked = useRef<"h" | "v" | null>(null);

  const go = useCallback((i: number) => {
    setSlide(i <= 0 ? 0 : 1);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startX.current == null || startY.current == null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (!locked.current) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      locked.current = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null || locked.current !== "h") {
      startX.current = null;
      startY.current = null;
      locked.current = null;
      return;
    }
    const dx = e.changedTouches[0].clientX - startX.current;
    const thr = 48;
    if (dx < -thr) go(1); // swipe left → simulator
    if (dx > thr) go(0); // swipe right → pitch
    startX.current = null;
    startY.current = null;
    locked.current = null;
  };

  return (
    <section className="hero-section relative z-10 overflow-x-hidden py-3 sm:py-10 lg:py-14">
      <div className="container-shop !px-3 sm:!px-6">
        {/* —— Mobile: swipe carousel —— */}
        <div className="lg:hidden">
          <div
            className="relative overflow-hidden touch-pan-y"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div
              className="flex transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${slide * 100}%)` }}
            >
              <div className="w-full shrink-0 px-0">
                <PitchCard brands={brands} />
              </div>
              <div className="w-full shrink-0 px-0">
                <SimPanel
                  locale={locale}
                  presets={presets}
                  className="min-h-[70vh]"
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              aria-label="Hero"
              onClick={() => go(0)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border transition",
                slide === 0
                  ? "border-[var(--accent)] bg-[rgba(225,29,42,0.2)] text-primary"
                  : "border-white/15 text-muted-ui"
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  slide === 0 ? "w-5 bg-[var(--accent)]" : "w-1.5 bg-white/25"
                )}
              />
              <span
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  slide === 1 ? "w-5 bg-[var(--accent)]" : "w-1.5 bg-white/25"
                )}
              />
            </div>
            <button
              type="button"
              aria-label="Simulator"
              onClick={() => go(1)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border transition",
                slide === 1
                  ? "border-[var(--accent)] bg-[rgba(225,29,42,0.2)] text-primary"
                  : "border-white/15 text-muted-ui"
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-ui">
            {slide === 0 ? t("heroSwipeHint") : t("heroSwipeBack")}
          </p>
        </div>

        {/* —— Desktop: pitch | simulator —— */}
        <div className="hidden items-stretch gap-6 lg:grid lg:grid-cols-2">
          <PitchCard brands={brands} />
          <SimPanel
            locale={locale}
            presets={presets}
            className="min-h-[520px] max-h-[min(78vh,720px)]"
          />
        </div>
      </div>
    </section>
  );
}
