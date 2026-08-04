import { Link } from "@/i18n/routing";
import { getTranslations } from "next-intl/server";
import { Phone } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { getAllPublicSettings } from "@/lib/store-settings";

// Feature flag: thermal simulator link disabled site-wide (kept in code,
// not removed, per owner request 2026-08-01).
const SIMULATOR_LINK_ENABLED = false;
/** Temporarily hide blog links (route still works if opened directly). */
const BLOG_NAV_ENABLED = false;

export async function Footer() {
  const t = await getTranslations("footer");
  const tn = await getTranslations("nav");
  const tp = await getTranslations("pages");
  const year = new Date().getFullYear();
  let phones: string[] = [];
  let address = tp("address");
  let tg =
    process.env.NEXT_PUBLIC_TELEGRAM_URL || "https://t.me/+380637897699";
  let wa =
    process.env.NEXT_PUBLIC_WHATSAPP_URL || "https://wa.me/380637897699";
  let legalLine = "";
  try {
    const s = await getAllPublicSettings();
    phones = s.site.phones?.length ? s.site.phones : [];
    if (s.site.address) address = s.site.address;
    if (s.social.telegram) tg = s.social.telegram;
    if (s.social.whatsapp) wa = s.social.whatsapp;
    if (s.legal.entityName || s.legal.edrpou) {
      legalLine = [s.legal.entityName, s.legal.edrpou && `ЄДРПОУ ${s.legal.edrpou}`]
        .filter(Boolean)
        .join(" · ");
    }
  } catch {
    /* settings table may not exist yet */
  }

  return (
    <footer className="site-footer mt-auto shrink-0">
      <div className="container-shop grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-4">
            <SiteLogo size="md" showWordmark />
          </div>
          <p className="line-clamp-4 text-sm leading-relaxed text-secondary">
            {tp("aboutText")}
          </p>
          {legalLine ? (
            <p className="mt-2 text-xs text-muted-ui">{legalLine}</p>
          ) : null}
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
            {SIMULATOR_LINK_ENABLED && (
              <li>
                <Link
                  href="/simulator"
                  className="font-semibold text-[var(--accent)] hover:opacity-90"
                >
                  {tn("simulator")}
                </Link>
              </li>
            )}
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
            {BLOG_NAV_ENABLED && (
              <li>
                <Link href="/blog" className="hover:text-[var(--accent)]">
                  {tn("blog")}
                </Link>
              </li>
            )}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">
            {t("contacts")}
          </h4>
          <ul className="space-y-3 text-sm text-secondary">
            <li>{address}</li>
            {(phones.length
              ? phones
              : ["+38 063 789-76-99"]
            ).map((ph) => (
              <li key={ph}>
                <a
                  href={`tel:${ph.replace(/[^\d+]/g, "")}`}
                  className="inline-flex items-center gap-2 font-medium text-primary hover:text-[var(--accent)]"
                >
                  <Phone className="h-4 w-4" />
                  {ph}
                </a>
              </li>
            ))}
            <li className="flex flex-wrap items-center gap-3 pt-1">
              <a
                href={tg}
                target="_blank"
                rel="noreferrer"
                className="social-icon transition hover:brightness-110"
                aria-label="Telegram"
              >
                <BrandMark brand="telegram" size="lg" />
              </a>
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="social-icon transition hover:brightness-110"
                aria-label="WhatsApp"
              >
                <BrandMark brand="whatsapp" size="lg" />
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="site-footer__copy py-4 text-center text-xs text-muted-ui">
        © {year} Pro-Optics. {t("rights")}
      </div>
    </footer>
  );
}
