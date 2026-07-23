import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Truck, Headphones } from "lucide-react";

export async function Hero() {
  const t = await getTranslations("home");

  return (
    <section className="relative z-10 py-10 sm:py-14 lg:py-16">
      <div className="container-shop">
        {/* Compact glass panel — readable on animated background */}
        <div
          className="hero-glass mx-auto max-w-2xl rounded-[var(--radius-card)] px-6 py-8 sm:px-8 sm:py-9"
          style={{
            background: "rgba(22, 24, 29, 0.72)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            boxShadow:
              "0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
          }}
        >
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-ui sm:text-xs">
            Professional Optics · Ukraine
          </p>
          <h1 className="font-display text-2xl font-bold leading-[1.15] tracking-tight text-primary sm:text-3xl lg:text-[2rem]">
            {t("heroTitle")}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-secondary sm:text-[0.9375rem]">
            {t("heroSubtitle")}
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <NextLink
              href="/catalog/teplovizori"
              className="btn-hero btn-hero-primary shrink-0 !min-h-[2.5rem] !px-5 !text-sm"
            >
              <span className="truncate">{t("heroCta")}</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </NextLink>
            <a
              href="tel:+380501112233"
              className="btn-hero btn-hero-secondary shrink-0 !min-h-[2.5rem] !px-5 !text-sm"
            >
              <span className="truncate">{t("heroSecondary")}</span>
            </a>
          </div>

          <ul className="mt-6 grid gap-2.5 border-t border-white/[0.08] pt-5 sm:grid-cols-2 sm:gap-3">
            {[
              { icon: Truck, text: t("why2") },
              { icon: Headphones, text: t("why3") },
            ].map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
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
