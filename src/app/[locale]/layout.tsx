import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/types";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ConsultWidget } from "@/components/layout/ConsultWidget";
import { SiteBackground } from "@/components/layout/SiteBackground";
import { MobileScrollFix } from "@/components/layout/MobileScrollFix";
import { getCategories, getCategoryBrandsMap } from "@/lib/catalog";
import { Analytics as SiteAnalytics } from "@/components/Analytics";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { OrganizationJsonLd } from "@/components/seo/OrganizationJsonLd";
import { getAllPublicSettings } from "@/lib/store-settings";
import { publicStoreEmail, STORE_EMAIL } from "@/lib/contact";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * English is served to people but withheld from search until its content is
 * genuinely English — a page that mixes languages is worth less in the index
 * than no page at all. Remove this once the product texts are translated.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return locale === "en"
    ? { robots: { index: false, follow: true } }
    : {};
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const [categories, categoryBrandsMap, settings] = await Promise.all([
    getCategories(),
    getCategoryBrandsMap(),
    getAllPublicSettings(),
  ]);

  return (
    <NextIntlClientProvider messages={messages}>
      {/* Sitewide LocalBusiness + logo for Google Search / Maps association */}
      <OrganizationJsonLd
        name={settings.site.siteName || "Pro-Optics"}
        social={settings.social}
        phone={settings.site.phones?.[0] || null}
        email={publicStoreEmail(settings.site.email) || STORE_EMAIL}
        address={settings.site.address || null}
        hours={settings.site.hours || null}
      />
      <SiteBackground />
      <MobileScrollFix />
      {/* min-h-dvh keeps footer at viewport bottom on short pages without
          stretching document height past content on long pages */}
      {/* max-w-full (not 100vw): 100vw breaks vertical scroll on some Android/MIUI WebViews */}
      <div className="relative z-10 flex min-h-dvh w-full max-w-full flex-col overflow-x-hidden">
        <Header categories={categories} categoryBrandsMap={categoryBrandsMap} />
        <main className="w-full min-w-0 max-w-full flex-1">
          {children}
        </main>
        <Footer />
        <ConsultWidget />
        {/* Storefront-only analytics (never on /sitemap.xml / API) */}
        <SiteAnalytics />
        <VercelAnalytics />
      </div>
    </NextIntlClientProvider>
  );
}
