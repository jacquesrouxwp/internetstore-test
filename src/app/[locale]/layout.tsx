import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ConsultWidget } from "@/components/layout/ConsultWidget";
import { SiteBackground } from "@/components/layout/SiteBackground";
import { getCategories } from "@/lib/catalog";
import { Analytics } from "@/components/Analytics";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "uk" | "ru")) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const categories = await getCategories();

  return (
    <NextIntlClientProvider messages={messages}>
      <SiteBackground />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header categories={categories} />
        <main className="flex-1">{children}</main>
        <Footer />
        <ConsultWidget />
        <Analytics />
      </div>
    </NextIntlClientProvider>
  );
}
