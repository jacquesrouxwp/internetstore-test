import NextLink from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowRight, Headphones, ScanEye } from "lucide-react";
import { BlogCarousel } from "@/components/home/BlogCarousel";
import { HeroBrandMarquee } from "@/components/home/HeroBrandMarquee";
import { listPublishedPosts } from "@/lib/blog/repo";
import { getBrands } from "@/lib/catalog";
import {
  sortBrandsByPriority,
  visibleBrandGridBrands,
} from "@/lib/brand-priority";
import { STORE_PHONE_TEL } from "@/lib/contact";

// Feature flag: thermal simulator sandbox CTA disabled site-wide (kept in
// code, not removed, per owner request 2026-08-01).
const SIMULATOR_LINK_ENABLED = false;

/** Temporarily hide hero blog — no empty right glass (slot returns when true). */
const BLOG_HERO_ENABLED = false;

/**
 * Hero: pitch card + brand marquee.
 * Mobile uses short copy + .hero-mobile CSS so the glass block fits a phone.
 */
export async function Hero() {
  const t = await getTranslations("home");
  const locale = await getLocale();
  const [{ posts }, allBrands] = await Promise.all([
    BLOG_HERO_ENABLED
      ? listPublishedPosts({ limit: 5, page: 1 })
      : Promise.resolve({
          posts: [] as Awaited<
            ReturnType<typeof listPublishedPosts>
          >["posts"],
        }),
    getBrands(),
  ]);

  const brands = sortBrandsByPriority(visibleBrandGridBrands(allBrands));

  return (
    <section className="hero-section relative z-10 overflow-x-hidden py-3 sm:py-10 lg:py-14">
      <div className="container-shop !px-3 sm:!px-6">
        <div className="grid items-start gap-3 lg:grid-cols-2 lg:items-stretch lg:gap-6">
          <div className="hero-glass hero-mobile relative z-10 flex w-full max-w-full flex-col overflow-hidden rounded-[var(--radius-card)] px-3.5 py-3.5 sm:px-8 sm:py-9 lg:px-10 lg:py-11">
            <p className="hero-mobile__eyebrow mb-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-ui sm:mb-3 sm:text-[11px] sm:tracking-[0.2em] sm:text-xs">
              Professional Optics · Ukraine
            </p>

            {/* Short title on phone — full title from sm+ */}
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

            <div className="hero-mobile__cta mt-3 flex flex-row gap-1.5 sm:mt-7 sm:flex-wrap sm:gap-2.5">
              <NextLink
                href="/catalog/teplovizori"
                className="btn-hero btn-hero-primary hero-mobile__btn min-w-0 flex-1 sm:flex-none sm:!min-h-[2.6rem] sm:!px-6 sm:!text-sm"
              >
                <span className="truncate sm:hidden">{t("heroCtaMobile")}</span>
                <span className="hidden truncate sm:inline">{t("heroCta")}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              </NextLink>
              {SIMULATOR_LINK_ENABLED && (
                <NextLink
                  href="/simulator"
                  className="btn-hero hero-mobile__btn min-w-0 flex-1 !border-2 !border-[var(--accent)] !bg-[rgba(225,29,42,0.15)] !text-primary hover:!bg-[rgba(225,29,42,0.25)] sm:flex-none sm:!min-h-[2.6rem] sm:!px-6 sm:!text-sm"
                >
                  <ScanEye
                    className="h-3.5 w-3.5 shrink-0 text-[var(--accent)] sm:h-4 sm:w-4"
                    strokeWidth={2.25}
                  />
                  <span className="truncate">{t("heroSandbox")}</span>
                </NextLink>
              )}
              <a
                href={STORE_PHONE_TEL}
                className="btn-hero btn-hero-secondary hero-mobile__btn min-w-0 flex-1 sm:flex-none sm:!min-h-[2.6rem] sm:!px-6 sm:!text-sm"
              >
                <span className="truncate sm:hidden">
                  {t("heroSecondaryMobile")}
                </span>
                <span className="hidden truncate sm:inline">
                  {t("heroSecondary")}
                </span>
              </a>
            </div>

            <ul className="hero-mobile__perks mt-3 grid grid-cols-2 gap-1 border-t border-white/[0.1] pt-2.5 sm:mt-7 sm:gap-3 sm:pt-5">
              <li className="hero-perk flex min-w-0 items-center gap-1.5 rounded-lg px-1.5 py-1 sm:gap-2.5 sm:rounded-xl sm:px-3.5 sm:py-2.5">
                {/* Nova Poshta mark — small brand chip next to delivery line */}
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
              className="hero-mobile__marquee mt-2.5 border-t border-white/[0.1] pt-2.5 sm:mt-6 sm:pt-5"
            />
          </div>

          {BLOG_HERO_ENABLED ? (
            <div className="relative z-10 hidden min-h-[320px] w-full lg:flex lg:min-h-0">
              <div className="w-full lg:flex lg:flex-1">
                <BlogCarousel posts={posts} locale={locale} />
              </div>
            </div>
          ) : (
            <div className="hidden lg:block" aria-hidden />
          )}
        </div>
      </div>
    </section>
  );
}
