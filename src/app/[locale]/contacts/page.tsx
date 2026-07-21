import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";

export const metadata: Metadata = { title: "Контакти" };

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");

  return (
    <div className="container-shop py-12">
      <h1 className="section-title mb-8">{t("contactsTitle")}</h1>
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="card-surface space-y-6 p-8">
          <div className="flex gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-accent" />
            <div>
              <p className="font-medium text-ink">{t("address")}</p>
              <p className="text-sm text-muted">м. Печерська</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Phone className="mt-0.5 h-5 w-5 text-accent" />
            <div className="space-y-1 text-sm">
              <a href="tel:+380686928675" className="block font-medium hover:text-accent">
                +38 068 692-86-75
              </a>
              <a href="tel:+380507598893" className="block font-medium hover:text-accent">
                +38 050 759-88-93
              </a>
              <a href="tel:+380501112233" className="block font-medium hover:text-accent">
                +38 050 111-22-33
              </a>
            </div>
          </div>
          <div className="flex gap-3">
            <Mail className="mt-0.5 h-5 w-5 text-accent" />
            <a
              href="mailto:info@opticsshop.ua"
              className="text-sm font-medium hover:text-accent"
            >
              info@opticsshop.ua
            </a>
          </div>
          <p className="text-sm text-muted">Пн–Пт 9:00–18:00 · Сб 12:00–15:00</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-line bg-canvas">
          <iframe
            title="map"
            className="h-[360px] w-full grayscale-[20%]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2541.0!2d30.538!3d50.426!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z0LHRg9C70YzQstCw0YAg0JvQtdGB0ZYg0KPQutGA0LDRl9C90LrQuA!5e0!3m2!1suk!2sua!4v1"
          />
        </div>
      </div>
    </div>
  );
}
