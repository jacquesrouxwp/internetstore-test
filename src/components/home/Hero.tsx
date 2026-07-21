import { getTranslations } from "next-intl/server";
import { ParticleHero } from "@/components/ui/particle-hero";

export async function Hero() {
  const t = await getTranslations("home");

  return (
    <ParticleHero
      title={t("heroTitle")}
      subtitle={t("heroSubtitle")}
      ctaLabel={t("heroCta")}
      secondaryLabel={t("heroSecondary")}
    />
  );
}
