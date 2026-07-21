import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getTranslations, setRequestLocale } from "next-intl/server";

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
