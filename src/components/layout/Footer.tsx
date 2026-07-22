import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { Aperture, MessageCircle, Phone } from "lucide-react";

export async function Footer() {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const tp = await getTranslations("pages");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-black/40 backdrop-blur-md">
      <div className="container-shop grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white">
              <Aperture className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-semibold text-white">
              Pro<span className="text-accent">-Optics</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            {tp("aboutText").slice(0, 140)}…
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">
            {t("catalog")}
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>
              <Link href="/catalog/teplovizori" className="hover:text-accent">
                {tn("thermal")}
              </Link>
            </li>
            <li>
              <Link href="/catalog/pricili" className="hover:text-accent">
                {tn("scopes")}
              </Link>
            </li>
            <li>
              <Link href="/catalog/pnb" className="hover:text-accent">
                ПНБ
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">
            {t("info")}
          </h4>
          <ul className="space-y-2 text-sm text-slate-400">
            <li>
              <Link href="/about" className="hover:text-accent">
                {tn("about")}
              </Link>
            </li>
            <li>
              <Link href="/delivery" className="hover:text-accent">
                {tn("delivery")}
              </Link>
            </li>
            <li>
              <Link href="/warranty" className="hover:text-accent">
                {tn("warranty")}
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-accent">
                {tn("blog")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">
            {t("contacts")}
          </h4>
          <ul className="space-y-3 text-sm text-slate-400">
            <li>{tp("address")}</li>
            <li>
              <a
                href="tel:+380686928675"
                className="inline-flex items-center gap-2 font-medium text-white hover:text-accent"
              >
                <Phone className="h-4 w-4" />
                +38 068 692-86-75
              </a>
            </li>
            <li>
              <a
                href="https://t.me/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 hover:text-accent"
              >
                <MessageCircle className="h-4 w-4" />
                Telegram / Viber
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-slate-500">
        © {year} Pro-Optics. {t("rights")}
      </div>
    </footer>
  );
}
