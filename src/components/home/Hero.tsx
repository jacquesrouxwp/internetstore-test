import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Shield, Truck, Headphones } from "lucide-react";

export async function Hero() {
  const t = await getTranslations("home");

  return (
    <section className="relative overflow-hidden border-b border-line bg-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_#f4f4f5_0%,_transparent_55%)]" />
      <div className="container-shop relative grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            Professional Optics · Ukraine
          </p>
          <h1 className="font-display text-3xl font-semibold leading-[1.15] tracking-tight text-ink sm:text-4xl lg:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-muted sm:text-lg">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/catalog/teplovizori" className="btn-primary">
              {t("heroCta")}
              <ArrowRight className="h-4 w-4" />
            </Link>
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
                className="flex items-start gap-2 text-xs leading-snug text-muted"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
                {text}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="aspect-[4/3] rounded-2xl border border-line bg-canvas p-8 shadow-card">
            <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-line/80 bg-white">
              <div className="mb-4 h-24 w-32 rounded-[2rem] bg-gradient-to-br from-zinc-600 to-zinc-800 shadow-lg">
                <div className="mx-auto mt-8 h-10 w-10 rounded-full border-2 border-white/80" />
              </div>
              <p className="text-sm font-medium text-ink">Thermal Optics</p>
              <p className="mt-1 text-xs text-muted">256 · 384 · 640 matrix</p>
            </div>
          </div>
          <div className="absolute -bottom-4 -left-2 rounded-xl border border-line bg-white px-4 py-3 shadow-lift sm:left-4">
            <p className="text-[11px] uppercase tracking-wider text-muted">In stock</p>
            <p className="text-sm font-semibold text-ink">18+ models</p>
          </div>
        </div>
      </div>
    </section>
  );
}
