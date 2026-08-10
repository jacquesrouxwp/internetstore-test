import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import { Mail, Phone } from "lucide-react";
import { InfoPage } from "@/components/layout/InfoPage";
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/contact";

export const metadata: Metadata = { title: "Контакти" };

export default async function ContactsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("pages");
  const isRu = locale === "ru";

  return (
    <InfoPage title={t("contactsTitle")} wide>
      <div className="info-page__panel max-w-xl space-y-6">
        <div className="flex gap-3">
          <Phone className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.75} />
          <div className="space-y-1.5 text-[0.9375rem] leading-relaxed">
            <a
              href={STORE_PHONE_TEL}
              className="block font-medium text-primary hover:text-accent"
            >
              {STORE_PHONE_DISPLAY}
            </a>
          </div>
        </div>
        <div className="flex gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-accent" strokeWidth={1.75} />
          <a
            href="mailto:info@pro-optics.ua"
            className="text-[0.9375rem] font-medium text-primary hover:text-accent"
          >
            info@pro-optics.ua
          </a>
        </div>
        <p className="text-[0.9375rem] leading-relaxed text-secondary">
          {isRu
            ? "Пн–Пт 9:00–18:00 · Сб 12:00–15:00"
            : "Пн–Пт 9:00–18:00 · Сб 12:00–15:00"}
        </p>
      </div>
    </InfoPage>
  );
}
