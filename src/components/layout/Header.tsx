"use client";

import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import {
  Menu,
  Search,
  ShoppingCart,
  Phone,
  X,
} from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";
import { categoryName } from "@/types";
import { SiteLogo } from "@/components/layout/SiteLogo";

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
      <div
        className="border-b text-xs backdrop-blur-md"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          color: "var(--text-secondary)",
        }}
      >
        <div className="container-shop flex flex-wrap items-center gap-x-6 gap-y-2 py-2">
          <span className="text-muted-ui">{t("workNote")}</span>
          <a
            href="tel:+380501112233"
            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:opacity-90"
          >
            <Phone className="h-3.5 w-3.5" />
            +38 050 111-22-33
          </a>
          <span className="hidden text-muted-ui sm:inline">{t("hours")}</span>
          <div className="ml-auto flex items-center gap-4">
            <button
              type="button"
              onClick={() => switchLocale("uk")}
              className={cn(
                "font-medium uppercase tracking-wide transition",
                locale === "uk"
                  ? "text-primary"
                  : "text-faint hover:text-primary"
              )}
            >
              UA
            </button>
            <button
              type="button"
              onClick={() => switchLocale("ru")}
              className={cn(
                "font-medium uppercase tracking-wide transition",
                locale === "ru"
                  ? "text-primary"
                  : "text-faint hover:text-primary"
              )}
            >
              RU
            </button>
          </div>
        </div>
      </div>

      <header
        className="sticky top-0 z-50 border-b backdrop-blur-md"
        style={{
          background: "var(--surface)",
          borderColor: "var(--border)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="container-shop flex items-center gap-4 py-3.5 sm:gap-6">
          <Link
            href="/"
            className="site-logo-header flex shrink-0 items-center gap-2"
          >
            <SiteLogo slotId="site-logo-slot" size="md" showWordmark />
          </Link>

          <form
            onSubmit={onSearch}
            className="search-field hidden min-w-0 flex-1 md:block"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="search-field__input"
              autoComplete="off"
              enterKeyHint="search"
            />
            <button
              type="submit"
              className="search-field__btn"
              aria-label="Search"
            >
              <Search className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.25} />
            </button>
          </form>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium text-primary transition"
              style={{
                border: "1px solid var(--border-strong)",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={1.75} />
              <span className="hidden sm:inline">{t("cart")}</span>
              {mounted && count > 0 && (
                <span
                  className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white"
                  style={{ background: "var(--accent)" }}
                >
                  {count}
                </span>
              )}
            </Link>
            <button
              type="button"
              className="rounded-[10px] p-2 text-primary md:hidden"
              style={{ border: "1px solid var(--border-strong)" }}
              onClick={() => setOpen(true)}
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="hidden border-t md:block" style={{ borderColor: "var(--border)" }}>
          <div className="container-shop">
            <ul className="flex gap-1 overflow-x-auto py-2 no-scrollbar">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/catalog/${c.slug}`}
                    className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium text-secondary transition hover:bg-white/[0.06] hover:text-primary"
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
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-label="Close"
          />
          <div
            className="absolute right-0 top-0 flex h-full w-[min(100%,320px)] flex-col shadow-lift"
            style={{
              background: "var(--surface-solid)",
              borderLeft: "1px solid var(--border)",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 text-primary"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span className="font-semibold">Menu</span>
              <button type="button" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={onSearch}
              className="search-field p-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="search-field__input"
                autoComplete="off"
                enterKeyHint="search"
              />
              <button
                type="submit"
                className="search-field__btn"
                aria-label="Search"
              >
                <Search className="h-[1.15rem] w-[1.15rem]" strokeWidth={2.25} />
              </button>
            </form>
            <ul className="flex-1 overflow-y-auto p-2">
              {categories.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/catalog/${c.slug}`}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium text-primary hover:bg-white/[0.06]"
                  >
                    {categoryName(c, locale as "uk" | "ru")}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/about"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm text-secondary hover:bg-white/[0.06]"
                >
                  {t("about")}
                </Link>
              </li>
              <li>
                <Link
                  href="/contacts"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-sm text-secondary hover:bg-white/[0.06]"
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
