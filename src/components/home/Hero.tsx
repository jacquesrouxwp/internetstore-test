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
      <div className="container-shop relative z-10 grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
        <div>
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

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="card-surface aspect-[4/3] p-6">
            <div
              className="photo-plate flex h-full flex-col items-center justify-center rounded-xl"
              style={{ border: "1px dashed rgba(0,0,0,0.08)" }}
            >
              <div className="mb-4 h-24 w-32 rounded-[2rem] bg-[#d0d0d4] shadow-sm">
                <div className="mx-auto mt-8 h-10 w-10 rounded-full border-2 border-white/90" />
              </div>
              <p className="text-sm font-semibold text-zinc-800">Thermal Optics</p>
              <p className="mt-1 text-xs text-zinc-500">256 · 384 · 640 matrix</p>
            </div>
          </div>
          <div
            className="absolute -bottom-4 -left-2 rounded-card px-4 py-3 sm:left-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <p className="text-[11px] uppercase tracking-wider text-muted-ui">
              In stock
            </p>
            <p className="text-sm font-semibold text-primary">18+ models</p>
          </div>
        </div>
      </div>
    </section>
  );
}
