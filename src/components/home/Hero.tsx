import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Truck, Headphones } from "lucide-react";

export async function Hero() {
  const t = await getTranslations("home");

  return (
    <section className="relative z-10 py-10 sm:py-14 lg:py-16">
      <div className="container-shop">
        {/* Glass panel — more transparent, left-aligned on desktop, slightly larger */}
        <div
          className="hero-glass w-full max-w-xl rounded-[var(--radius-card)] px-6 py-8 sm:max-w-2xl sm:px-9 sm:py-10 lg:max-w-3xl lg:mr-auto lg:px-10 lg:py-11"
          style={{
            /* Semi-clear glass: background shows through, text stays readable */
            background: "rgba(12, 14, 20, 0.28)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            boxShadow:
              "0 12px 40px rgba(0, 0, 0, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
            backdropFilter: "blur(6px) saturate(1.15)",
            WebkitBackdropFilter: "blur(6px) saturate(1.15)",
          }}
        >
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
            <a
              href="tel:+380501112233"
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
                className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.07)",
                }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: "rgba(225, 29, 42, 0.14)",
                    color: "var(--accent)",
                  }}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="text-xs font-semibold leading-snug text-primary sm:text-sm">
                  {text}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
