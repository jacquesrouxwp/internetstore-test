import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["uk", "ru", "en"],
  defaultLocale: "uk",
  localePrefix: "as-needed",
  /**
   * The bare domain always serves Ukrainian.
   *
   * next-intl otherwise reads Accept-Language and redirects, which only became
   * visible when "en" joined the list: a browser set to English asked for the
   * homepage and got 307 to /en. Googlebot crawls with en-US, so it was being
   * bounced to a page carrying noindex — the Ukrainian homepage would have
   * dropped out of the index for it.
   *
   * Visitors choose the language with the tabs in the header, which is also
   * what Google asks for: serve one language per URL and let people switch.
   */
  localeDetection: false,
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
