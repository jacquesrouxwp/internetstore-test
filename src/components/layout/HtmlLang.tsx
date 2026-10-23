"use client";

import { useEffect } from "react";

/** Keeps <html lang> in step when the language tabs switch pages without a reload. */
export function HtmlLang({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
