"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

export function ConsultWidget() {
  const t = useTranslations("footer");
  return (
    <a
      href="https://t.me/"
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lift transition hover:bg-accent-hover"
      aria-label={t("consult")}
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">{t("consult")}</span>
    </a>
  );
}
