import NextLink from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Shield, Truck, Headphones } from "lucide-react";

export async function Hero() {
  const t = await getTranslations("home");

  return (
    <section className="relative overflow-hidden border-b border-white/10">
      <div className="container-shop relative z-10 grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/70">
            Professional Optics · Ukraine
          </p>
          <h1 className="font-display text-3xl font-semibold leading-[1.12] tracking-tight text-white sm:text-4xl lg:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-300 sm:text-lg">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <NextLink href="/catalog/teplovizori" className="btn-primary">
              {t("heroCta")}
              <ArrowRight className="h-4 w-4" />
            </NextLink>
            <a href="tel:+380501112233" className="btn-secondary">
              {t("heroSecondary")}
            </a>
          </div>
          <ul className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Shield, text: t("why1") },
              { icon: Truck, text: t("why2") },
              { icon: Headphones, text: t("why3") },
            ].map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-start gap-2 text-xs leading-snug text-slate-400"
              >
                <Icon
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                  strokeWidth={1.75}
                />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="card-surface aspect-[4/3] p-8">
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/5">
              <div className="mb-4 h-24 w-32 rounded-[2rem] bg-gradient-to-br from-zinc-400 to-zinc-700 shadow-lg">
                <div className="mx-auto mt-8 h-10 w-10 rounded-full border-2 border-white/80" />
              </div>
              <p className="text-sm font-medium text-white">Thermal Optics</p>
              <p className="mt-1 text-xs text-slate-400">256 · 384 · 640 matrix</p>
            </div>
          </div>
          <div className="absolute -bottom-4 -left-2 rounded-xl border border-white/10 bg-[#0a0c14]/90 px-4 py-3 shadow-lift backdrop-blur sm:left-4">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">
              In stock
            </p>
            <p className="text-sm font-semibold text-white">18+ models</p>
          </div>
        </div>
      </div>
    </section>
  );
}
