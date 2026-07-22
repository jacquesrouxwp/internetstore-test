import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Truck, Headphones } from "lucide-react";

export async function Hero() {
  const t = await getTranslations("home");

  return (
    <section
      className="relative overflow-hidden"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="container-shop relative z-10 max-w-3xl py-16 lg:py-24">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-ui sm:text-sm">
          Professional Optics · Ukraine
        </p>
        <h1 className="font-display text-3xl font-bold leading-[1.12] tracking-tight text-primary sm:text-4xl lg:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="mt-5 max-w-lg text-base leading-relaxed text-secondary sm:text-lg">
          {t("heroSubtitle")}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <NextLink
            href="/catalog/teplovizori"
            className="btn-hero btn-hero-primary shrink-0"
          >
            <span className="truncate">{t("heroCta")}</span>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </NextLink>
          <a
            href="tel:+380501112233"
            className="btn-hero btn-hero-secondary shrink-0"
          >
            <span className="truncate">{t("heroSecondary")}</span>
          </a>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5">
          {[
            { icon: Truck, text: t("why2") },
            { icon: Headphones, text: t("why3") },
          ].map(({ icon: Icon, text }) => (
            <li
              key={text}
              className="card-surface flex items-center gap-3 px-4 py-3.5"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "rgba(225, 29, 42, 0.12)",
                  color: "var(--accent)",
                }}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <span className="text-sm font-semibold leading-snug text-primary sm:text-base">
                {text}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
