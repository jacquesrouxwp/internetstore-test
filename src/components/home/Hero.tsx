import NextLink from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { ArrowRight, Truck, Headphones, ScanEye } from "lucide-react";
import { BlogCarousel } from "@/components/home/BlogCarousel";
import { HeroTrustPanel } from "@/components/home/HeroTrustPanel";
import { listPublishedPosts } from "@/lib/blog/repo";
import { getBrands } from "@/lib/catalog";
import {
  sortBrandsByPriority,
  visibleBrandGridBrands,
} from "@/lib/brand-priority";

// Feature flag: thermal simulator sandbox CTA disabled site-wide (kept in
// code, not removed, per owner request 2026-08-01).
const SIMULATOR_LINK_ENABLED = false;

/** Temporarily hide hero blog carousel — trust panel fills the slot instead. */
const BLOG_HERO_ENABLED = false;

/**
 * Hero: left — CTA glass card; right — trust panel + brand marquee
 * (or blog carousel when BLOG_HERO_ENABLED).
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
    <section className="relative z-10 overflow-hidden py-10 sm:py-14 lg:py-16">
      <div className="container-shop">
        <div className="grid items-stretch gap-5 lg:grid-cols-2 lg:gap-6">
          {/* Left — main pitch */}
          <div className="hero-glass relative z-10 flex w-full flex-col rounded-[var(--radius-card)] px-6 py-8 sm:px-9 sm:py-10 lg:px-10 lg:py-11">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-ui sm:text-xs">
              Professional Optics · Ukraine
            </p>
            <h1 className="font-display text-[1.65rem] font-bold leading-[1.15] tracking-tight text-primary sm:text-3xl lg:text-[2.15rem]">
              {t("heroTitle")}
            </h1>
            <p className="mt-3.5 max-w-2xl text-[0.9375rem] leading-relaxed text-secondary sm:text-base">
              {t("heroSubtitle")}
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
              <NextLink
                href="/catalog/teplovizori"
                className="btn-hero btn-hero-primary shrink-0 !min-h-[2.6rem] !px-6 !text-sm"
              >
                <span className="truncate">{t("heroCta")}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </NextLink>
              {SIMULATOR_LINK_ENABLED && (
                <NextLink
                  href="/simulator"
                  className="btn-hero shrink-0 !min-h-[2.6rem] !border-2 !border-[var(--accent)] !bg-[rgba(225,29,42,0.15)] !px-6 !text-sm !text-primary hover:!bg-[rgba(225,29,42,0.25)]"
                >
                  <ScanEye
                    className="h-4 w-4 shrink-0 text-[var(--accent)]"
                    strokeWidth={2.25}
                  />
                  <span className="truncate">{t("heroSandbox")}</span>
                </NextLink>
              )}
              <a
                href="tel:+380637897699"
                className="btn-hero btn-hero-secondary shrink-0 !min-h-[2.6rem] !px-6 !text-sm"
              >
                <span className="truncate">{t("heroSecondary")}</span>
              </a>
            </div>

            <ul className="mt-7 grid gap-2.5 border-t border-white/[0.1] pt-5 sm:grid-cols-2 sm:gap-3">
              {[
                { icon: Truck, text: t("why2") },
                { icon: Headphones, text: t("why3") },
              ].map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="hero-perk flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
                >
                  <span className="hero-perk__icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <Icon className="h-4 w-4" strokeWidth={1.75} />
                  </span>
                  <span className="text-xs font-semibold leading-snug text-primary sm:text-sm">
                    {text}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right — trust panel + brand ticker (or blog when enabled) */}
          <div className="relative z-10 flex min-h-0 w-full flex-col">
            {BLOG_HERO_ENABLED ? (
              <div className="hidden w-full lg:flex lg:min-h-[320px] lg:flex-1">
                <BlogCarousel posts={posts} locale={locale} />
              </div>
            ) : (
              <HeroTrustPanel brands={brands} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
