"use client";

/**
 * Right-hand hero slot: glass trust card + brand marquee.
 * Inspired by glassmorphism trust hero UI — shop colors only.
 */

import type { Brand } from "@/types";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import {
  Target,
  Crown,
  Truck,
  Headphones,
  ShieldCheck,
} from "lucide-react";
import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { cn } from "@/lib/utils";

type Props = {
  brands: Brand[];
  className?: string;
};

function StatItem({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center transition-transform hover:-translate-y-0.5">
      <span className="text-lg font-bold tracking-tight text-primary sm:text-xl">
        {value}
      </span>
      <span className="mt-0.5 text-center text-[10px] font-medium uppercase tracking-wider text-muted-ui sm:text-[11px]">
        {label}
      </span>
    </div>
  );
}

function BrandChip({ brand }: { brand: Brand }) {
  const href = `/catalog/teplovizori?brand=${encodeURIComponent(brand.slug)}`;
  return (
    <Link
      href={href}
      className={cn(
        "group flex shrink-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2",
        "transition hover:border-[var(--accent)]/45 hover:bg-white/[0.07]"
      )}
      title={brand.name}
    >
      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg bg-white px-1">
        {brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={brand.logoUrl}
            alt=""
            className="max-h-6 w-auto max-w-full object-contain"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          <span className="text-[10px] font-bold text-zinc-800">
            {brand.name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </span>
      <span className="whitespace-nowrap text-sm font-semibold tracking-tight text-primary group-hover:text-white">
        {brand.name}
      </span>
    </Link>
  );
}

export function HeroTrustPanel({ brands, className }: Props) {
  const t = useTranslations("home");
  const locale = useLocale();
  const brandCount = brands.length;

  // Enough items for a smooth loop on wide screens
  const track =
    brandCount === 0
      ? []
      : brandCount < 6
        ? [...brands, ...brands, ...brands]
        : [...brands, ...brands];

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col gap-3 sm:gap-4",
        className
      )}
    >
      {/* —— Trust / stats glass card —— */}
      <div className="hero-glass relative flex-1 overflow-hidden rounded-[var(--radius-card)] p-6 sm:p-7">
        {/* Soft accent glow */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl"
          style={{ background: "rgba(225, 29, 42, 0.12)" }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-12 h-48 w-48 rounded-full blur-3xl"
          style={{ background: "rgba(255, 255, 255, 0.04)" }}
          aria-hidden
        />

        <div className="relative z-10">
          <div className="mb-6 flex items-center gap-3.5 sm:mb-7">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1"
              style={{
                background: "var(--hero-perk-icon-bg)",
                color: "var(--accent)",
                boxShadow: "inset 0 0 0 1px rgba(225, 29, 42, 0.15)",
              }}
            >
              <Target className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="font-display text-3xl font-bold tracking-tight text-primary">
                {brandCount > 0 ? `${brandCount}+` : "—"}
              </div>
              <div className="text-sm text-secondary">{t("heroTrustHeadline")}</div>
            </div>
          </div>

          {/* Service bar */}
          <div className="mb-6 space-y-2.5 sm:mb-7">
            <div className="flex justify-between text-sm">
              <span className="text-secondary">{t("heroTrustBarLabel")}</span>
              <span className="font-medium text-primary">
                {t("heroTrustBarValue")}
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full"
              style={{ background: "rgba(255, 255, 255, 0.06)" }}
            >
              <div
                className="h-full w-[96%] rounded-full"
                style={{
                  background:
                    "linear-gradient(90deg, var(--accent) 0%, #f07178 55%, rgba(255,255,255,0.55) 100%)",
                }}
              />
            </div>
          </div>

          <div
            className="mb-5 h-px w-full sm:mb-6"
            style={{ background: "rgba(255, 255, 255, 0.1)" }}
          />

          {/* Mini stats */}
          <div className="flex items-stretch justify-between gap-1 text-center">
            <StatItem value={t("heroTrustStat1Value")} label={t("heroTrustStat1Label")} />
            <div
              className="w-px self-stretch"
              style={{ background: "rgba(255, 255, 255, 0.1)" }}
              aria-hidden
            />
            <StatItem value={t("heroTrustStat2Value")} label={t("heroTrustStat2Label")} />
            <div
              className="w-px self-stretch"
              style={{ background: "rgba(255, 255, 255, 0.1)" }}
              aria-hidden
            />
            <StatItem value={t("heroTrustStat3Value")} label={t("heroTrustStat3Label")} />
          </div>

          {/* Pills */}
          <div className="mt-6 flex flex-wrap gap-2 sm:mt-7">
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-secondary"
              style={{ background: "rgba(255, 255, 255, 0.04)" }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              {t("heroTrustPillActive")}
            </div>
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-secondary"
              style={{ background: "rgba(255, 255, 255, 0.04)" }}
            >
              <Crown className="h-3 w-3 text-[var(--rating)]" />
              {t("heroTrustPillPremium")}
            </div>
            <div
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-secondary"
              style={{ background: "rgba(255, 255, 255, 0.04)" }}
            >
              <Truck className="h-3 w-3 text-[var(--accent)]" />
              {locale === "ru" ? "НП" : "НП"}
            </div>
          </div>

          {/* Subtle perk icons strip */}
          <ul className="mt-5 hidden gap-2 border-t border-white/[0.08] pt-4 sm:grid sm:grid-cols-3">
            {[
              { icon: Truck, text: t("why2") },
              { icon: Headphones, text: t("why3") },
              { icon: ShieldCheck, text: t("why1") },
            ].map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="hero-perk flex items-center gap-2 rounded-lg px-2 py-1.5"
              >
                <Icon
                  className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]"
                  strokeWidth={1.75}
                />
                <span className="line-clamp-2 text-[10px] font-medium leading-snug text-secondary">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* —— Brand marquee —— */}
      {track.length > 0 && (
        <div className="hero-glass overflow-hidden rounded-[var(--radius-card)] py-4 sm:py-5">
          <h3 className="mb-3.5 px-5 text-xs font-medium uppercase tracking-[0.14em] text-muted-ui sm:px-6 sm:text-sm sm:normal-case sm:tracking-normal">
            {t("heroTrustBrandsTitle")}
          </h3>
          <div
            className="relative"
            style={{
              maskImage:
                "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            }}
          >
            <InfiniteSlider
              direction="horizontal"
              gap={12}
              duration={38}
              durationOnHover={100}
              className="px-2"
            >
              {track.map((b, i) => (
                <BrandChip key={`${b.id}-${i}`} brand={b} />
              ))}
            </InfiniteSlider>
          </div>
        </div>
      )}
    </div>
  );
}
