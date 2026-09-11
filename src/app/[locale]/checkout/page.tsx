import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";

// Per-visitor state with no content worth ranking — keep it out of the index
// (links are still followed).
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("checkout");

  return (
    <div className="container-shop py-8 sm:py-12">
      <h1 className="section-title mb-8">{t("title")}</h1>
      <CheckoutForm />
    </div>
  );
}
