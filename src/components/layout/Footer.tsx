import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { Phone } from "lucide-react";
import { SocialIconLink } from "@/components/ui/SocialIcons";
import { SiteLogo } from "@/components/layout/SiteLogo";

export async function Footer() {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const tp = await getTranslations("pages");
  const year = new Date().getFullYear();

  return (
    <footer
      className="mt-auto"
      style={{
        background: "var(--surface)",
        borderTop: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="container-shop grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-4">
            <SiteLogo size="sm" showWordmark />
          </div>
          <p className="text-sm leading-relaxed text-secondary">
            {tp("aboutText").slice(0, 140)}…
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
            {t("catalog")}
          </h4>
          <ul className="space-y-2 text-sm text-secondary">
            <li>
              <Link href="/catalog/teplovizori" className="hover:text-[var(--accent)]">
                {tn("thermal")}
              </Link>
            </li>
            <li>
              <Link href="/catalog/pricili" className="hover:text-[var(--accent)]">
                {tn("scopes")}
              </Link>
            </li>
            <li>
              <Link href="/catalog/pnb" className="hover:text-[var(--accent)]">
                ПНБ
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
            {t("info")}
          </h4>
          <ul className="space-y-2 text-sm text-secondary">
            <li>
              <Link href="/about" className="hover:text-[var(--accent)]">
                {tn("about")}
              </Link>
            </li>
            <li>
              <Link href="/delivery" className="hover:text-[var(--accent)]">
                {tn("delivery")}
              </Link>
            </li>
            <li>
              <Link href="/warranty" className="hover:text-[var(--accent)]">
                {tn("warranty")}
              </Link>
            </li>
            <li>
              <Link href="/blog" className="hover:text-[var(--accent)]">
                {tn("blog")}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
            {t("contacts")}
          </h4>
          <ul className="space-y-3 text-sm text-secondary">
            <li>{tp("address")}</li>
            <li>
              <a
                href="tel:+380686928675"
                className="inline-flex items-center gap-2 font-medium text-primary hover:text-[var(--accent)]"
              >
                <Phone className="h-4 w-4" />
                +38 068 692-86-75
              </a>
            </li>
            <li className="flex flex-wrap items-center gap-4 pt-1">
              <SocialIconLink
                brand="telegram"
                href={
                  process.env.NEXT_PUBLIC_TELEGRAM_URL ||
                  "https://t.me/pro_optics_ua"
                }
                size={28}
              />
              <SocialIconLink
                brand="viber"
                href={
                  process.env.NEXT_PUBLIC_VIBER_URL ||
                  "viber://chat?number=%2B380501112233"
                }
                size={28}
              />
              <SocialIconLink
                brand="whatsapp"
                href={
                  process.env.NEXT_PUBLIC_WHATSAPP_URL ||
                  "https://wa.me/380501112233"
                }
                size={28}
              />
            </li>
          </ul>
        </div>
      </div>
      <div
        className="py-4 text-center text-xs text-faint"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        © {year} Pro-Optics. {t("rights")}
      </div>
    </footer>
  );
}
