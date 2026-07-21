"use client";

import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import {
  Menu,
  Search,
  ShoppingCart,
  Phone,
  X,
  Aperture,
} from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";
import { categoryName } from "@/types";
import { LightSwitch } from "@/components/layout/LightSwitch";

export function Header({ categories }: { categories: Category[] }) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const switchLocale = (next: "uk" | "ru") => {
    router.replace(pathname, { locale: next });
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    router.push(`/catalog/teplovizori${params}`);
    setOpen(false);
  };

  return (
    <>
      <div className="border-b border-white/10 bg-ink text-xs text-zinc-300">
        <div className="container-shop flex flex-wrap items-center gap-x-6 gap-y-2 py-2">
          <span className="text-zinc-400">{t("workNote")}</span>
          <a
            href="tel:+380501112233"
            className="inline-flex items-center gap-1.5 font-semibold text-white hover:text-white/90"
          >
            <Phone className="h-3.5 w-3.5" />
            +38 050 111-22-33
          </a>
          <span className="hidden text-zinc-400 sm:inline">{t("hours")}</span>
          <div className="ml-auto flex items-center gap-4">
            <button
              type="button"
              onClick={() => switchLocale("uk")}
              className={cn(
                "font-medium uppercase tracking-wide",
                locale === "uk" ? "text-white" : "text-zinc-500 hover:text-white"
              )}
            >
              UA
            </button>
            <button
              type="button"
              onClick={() => switchLocale("ru")}
              className={cn(
                "font-medium uppercase tracking-wide",
                locale === "ru" ? "text-white" : "text-zinc-500 hover:text-white"
              )}
            >
              RU
            </button>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur-md">
        <div className="container-shop flex items-center gap-4 py-3.5 sm:gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white">
              <Aperture className="h-5 w-5" strokeWidth={1.75} />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-ink">
              Optics<span className="text-accent">Shop</span>
            </span>
          </Link>

          <form
            onSubmit={onSearch}
            className="relative hidden min-w-0 flex-1 md:block"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="input pr-11"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
          </form>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <LightSwitch />
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink transition hover:border-ink/20 hover:bg-canvas"
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={1.75} />
              <span className="hidden sm:inline">{t("cart")}</span>
              {mounted && count > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
            </Link>
            <button
              type="button"
              className="rounded-lg border border-line p-2 md:hidden"
              onClick={() => setOpen(true)}
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="hidden border-t border-line md:block">
          <div className="container-shop">
            <ul className="flex gap-1 overflow-x-auto py-2 no-scrollbar">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/catalog/${c.slug}`}
                    className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-canvas hover:text-ink"
                  >
                    {categoryName(c, locale as "uk" | "ru")}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </header>

      {open && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />
          <div className="absolute right-0 top-0 flex h-full w-[min(100%,320px)] flex-col bg-white shadow-lift">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="font-semibold">Menu</span>
              <button type="button" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={onSearch} className="border-b border-line p-4">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="input"
              />
            </form>
            <ul className="flex-1 overflow-y-auto p-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/catalog/${c.slug}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-canvas"
                  >
                    {categoryName(c, locale as "uk" | "ru")}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/about"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm hover:bg-canvas"
                >
                  {t("about")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contacts"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm hover:bg-canvas"
                >
                  {t("contacts")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
