import NextLink from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowRight, Truck, Headphones, ScanEye } from "lucide-react";
import { BlogCarousel } from "@/components/home/BlogCarousel";
import { HeroBrandMarquee } from "@/components/home/HeroBrandMarquee";
import { listPublishedPosts } from "@/lib/blog/repo";
import { getBrands } from "@/lib/catalog";
import {
  sortBrandsByPriority,
  visibleBrandGridBrands,
} from "@/lib/brand-priority";

// Feature flag: thermal simulator sandbox CTA disabled site-wide (kept in
// code, not removed, per owner request 2026-08-01).
const SIMULATOR_LINK_ENABLED = false;

/** Temporarily hide hero blog — no empty right glass (slot returns when true). */
const BLOG_HERO_ENABLED = false;

/**
 * Hero: pitch card + brand marquee (half width on desktop).
 * Mobile: compact padding/type so the glass block is not stretched tall.
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
    <section className="relative z-10 overflow-hidden py-5 sm:py-10 lg:py-14">
      <div className="container-shop">
        <div className="grid items-stretch gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Pitch + brand ticker */}
          <div className="hero-glass relative z-10 flex w-full flex-col rounded-[var(--radius-card)] px-4 py-5 sm:px-8 sm:py-9 lg:px-10 lg:py-11">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-ui sm:mb-3 sm:text-[11px] sm:tracking-[0.2em] sm:text-xs">
              Professional Optics · Ukraine
            </p>
            <h1 className="font-display text-[1.35rem] font-bold leading-[1.18] tracking-tight text-primary sm:text-3xl sm:leading-[1.15] lg:text-[2.15rem]">
              {t("heroTitle")}
            </h1>
            <p className="mt-2 max-w-2xl text-[0.8125rem] leading-snug text-secondary sm:mt-3.5 sm:text-[0.9375rem] sm:leading-relaxed sm:text-base">
              {t("heroSubtitle")}
            </p>

            <div className="mt-4 flex flex-col gap-2 sm:mt-7 sm:flex-row sm:flex-wrap sm:gap-2.5">
              <NextLink
                href="/catalog/teplovizori"
                className="btn-hero btn-hero-primary w-full shrink-0 !min-h-[2.4rem] !px-5 !py-2 !text-[0.8125rem] sm:w-auto sm:!min-h-[2.6rem] sm:!px-6 sm:!text-sm"
              >
                <span className="truncate">{t("heroCta")}</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              </NextLink>
              {SIMULATOR_LINK_ENABLED && (
                <NextLink
                  href="/simulator"
                  className="btn-hero w-full shrink-0 !min-h-[2.4rem] !border-2 !border-[var(--accent)] !bg-[rgba(225,29,42,0.15)] !px-5 !py-2 !text-[0.8125rem] !text-primary hover:!bg-[rgba(225,29,42,0.25)] sm:w-auto sm:!min-h-[2.6rem] sm:!px-6 sm:!text-sm"
                >
                  <ScanEye
                    className="h-3.5 w-3.5 shrink-0 text-[var(--accent)] sm:h-4 sm:w-4"
                    strokeWidth={2.25}
                  />
                  <span className="truncate">{t("heroSandbox")}</span>
                </NextLink>
              )}
              <a
                href="tel:+380637897699"
                className="btn-hero btn-hero-secondary w-full shrink-0 !min-h-[2.4rem] !px-5 !py-2 !text-[0.8125rem] sm:w-auto sm:!min-h-[2.6rem] sm:!px-6 sm:!text-sm"
              >
                <span className="truncate">{t("heroSecondary")}</span>
              </a>
            </div>

            <ul className="mt-4 grid grid-cols-2 gap-1.5 border-t border-white/[0.1] pt-3.5 sm:mt-7 sm:gap-2.5 sm:pt-5 sm:gap-3">
              {[
                { icon: Truck, text: t("why2") },
                { icon: Headphones, text: t("why3") },
              ].map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="hero-perk flex items-center gap-2 rounded-lg px-2 py-1.5 sm:gap-2.5 sm:rounded-xl sm:px-3.5 sm:py-2.5"
                >
                  <span className="hero-perk__icon flex h-7 w-7 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9">
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" strokeWidth={1.75} />
                  </span>
                  <span className="text-[10px] font-semibold leading-snug text-primary sm:text-xs sm:text-sm">
                    {text}
                  </span>
                </li>
              ))}
            </ul>

            <HeroBrandMarquee
              brands={brands}
              title={t("heroTrustBrandsTitle")}
              className="mt-3.5 border-t border-white/[0.1] pt-3.5 sm:mt-6 sm:pt-5"
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
