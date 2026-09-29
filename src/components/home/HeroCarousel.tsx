"use client";

/**
 * Hero: pitch card | featured blog card (same 2-col slot as old simulator).
 * Simulator: header CTA + /simulator — not embedded here.
 */

import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Headphones,
  RefreshCw,
} from "lucide-react";
import { HeroBrandMarquee } from "@/components/home/HeroBrandMarquee";
import { BlogCarousel } from "@/components/home/BlogCarousel";
import type { Brand } from "@/types";
import type { BlogPost } from "@/lib/blog/types";

type Props = {
  brands: Brand[];
  posts?: BlogPost[];
};


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

            {/* One H1 for the page — two (mobile + desktop) were both in the DOM */}
            <h1 className="font-display font-bold tracking-tight text-primary">
              <span className="hero-mobile__title block sm:hidden break-words hyphens-auto">
                {t("heroTitleMobile")}
              </span>
              <span className="hidden text-3xl leading-[1.15] sm:block lg:text-[2.15rem]">
                {t("heroTitle")}
              </span>
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
                    {t("heroTradeInBody")}{" "}
                    <Link
                      href="/vykup"
                      className="whitespace-nowrap font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      {t("heroTradeInMore")}
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            <div className="hero-mobile__cta mt-3 flex flex-row flex-wrap gap-1.5 sm:mt-6 sm:gap-2.5">
              <Link
                href="/catalog/teplovizori"
                className="btn-hero btn-hero-primary hero-mobile__btn min-w-0 flex-1 sm:flex-none sm:!min-h-[2.6rem] sm:!px-6 sm:!text-sm"
              >
                <span className="truncate sm:hidden">{t("heroCtaMobile")}</span>
                <span className="hidden truncate sm:inline">{t("heroCta")}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              </Link>
              <Link
                href="/vykup"
                className="btn-hero btn-hero-primary hero-mobile__btn min-w-0 flex-1 sm:flex-none sm:!min-h-[2.6rem] sm:!px-6 sm:!text-sm"
              >
                <span className="truncate sm:hidden">{t("heroBuybackMobile")}</span>
                <span className="hidden truncate sm:inline">{t("heroBuyback")}</span>
                <RefreshCw className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              </Link>
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

          {/* Featured article — desktop only (mobile: header «Статті» button → /blog) */}
          <div className="relative hidden min-h-0 lg:block">
            <BlogCarousel posts={posts} locale={locale} />
          </div>
        </div>
      </div>
    </section>
  );
}
