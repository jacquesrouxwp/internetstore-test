"use client";

import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import {
  Menu,
  Search,
  ShoppingCart,
  Phone,
  X,
  ScanEye,
} from "lucide-react";
import { useCart } from "@/lib/cart-store";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { Brand, Category } from "@/types";
import { categoryName } from "@/types";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { STORE_PHONE_DISPLAY, STORE_PHONE_TEL } from "@/lib/contact";
import { ConsultTrackLink } from "@/components/analytics/ConsultTrackLink";

/** Simulator in nav + header CTA next to cart. */
const SIMULATOR_LINK_ENABLED = true;
/** Blog in top / mobile nav for SEO internal linking. */
const BLOG_NAV_ENABLED = true;

export function Header({
  categories,
  categoryBrandsMap = {},
}: {
  categories: Category[];
  categoryBrandsMap?: Record<string, Brand[]>;
}) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mounted, setMounted] = useState(false);
  const [hoverCat, setHoverCat] = useState<{ slug: string; rect: DOMRect } | null>(
    null
  );
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  const openCategoryMenu = (slug: string, el: HTMLElement) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setHoverCat({ slug, rect: el.getBoundingClientRect() });
  };
  const scheduleCloseCategoryMenu = () => {
    closeTimer.current = setTimeout(() => setHoverCat(null), 150);
  };
  const cancelCloseCategoryMenu = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

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
          <ConsultTrackLink
            channel="phone"
            source="header"
            href={STORE_PHONE_TEL}
            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:opacity-90"
          >
            <Phone className="h-3.5 w-3.5" />
            {STORE_PHONE_DISPLAY}
          </ConsultTrackLink>
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
            {SIMULATOR_LINK_ENABLED && (
              <Link
                href="/simulator"
                className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[var(--accent)] bg-[rgba(225,29,42,0.12)] px-2.5 py-2 text-xs font-bold tracking-wide text-primary transition hover:bg-[rgba(225,29,42,0.22)] sm:px-3 sm:text-sm"
                title={t("simulator")}
              >
                <ScanEye
                  className="h-4 w-4 shrink-0 text-[var(--accent)]"
                  strokeWidth={2.25}
                />
                <span className="hidden sm:inline">{t("simulator")}</span>
              </Link>
            )}
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
            {/*
              flex-wrap so long labels (e.g. «Аксесуари») never clip mid-word.
              Full text always visible; second row only if categories overflow.
            */}
            <ul className="flex flex-wrap items-center gap-x-0.5 gap-y-1 py-2">
              {categories.map((c) => {
                const dropBrands = categoryBrandsMap[c.slug] || [];
                return (
                  <li
                    key={c.id}
                    className="shrink-0"
                    onMouseEnter={(e) =>
                      dropBrands.length &&
                      openCategoryMenu(c.slug, e.currentTarget)
                    }
                    onMouseLeave={scheduleCloseCategoryMenu}
                  >
                    <Link
                      href={`/catalog/${c.slug}`}
                      className="inline-block whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] font-medium leading-snug text-secondary transition hover:bg-white/[0.06] hover:text-primary lg:px-2.5 lg:text-sm"
                    >
                      {categoryName(c, locale as "uk" | "ru")}
                    </Link>
                  </li>
                );
              })}
              {SIMULATOR_LINK_ENABLED && (
                <li className="shrink-0">
                  <Link
                    href="/simulator"
                    className="inline-block whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] font-semibold leading-snug text-[var(--accent)] transition hover:bg-white/[0.06] lg:px-2.5 lg:text-sm"
                  >
                    {t("simulator")}
                  </Link>
                </li>
              )}
              {BLOG_NAV_ENABLED && (
                <li className="shrink-0">
                  <Link
                    href="/blog"
                    className="inline-block whitespace-nowrap rounded-md px-2 py-1.5 text-[13px] font-semibold leading-snug text-secondary transition hover:bg-white/[0.06] hover:text-primary lg:px-2.5 lg:text-sm"
                  >
                    {t("blog")}
                  </Link>
                </li>
              )}
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
              {SIMULATOR_LINK_ENABLED && (
                <li>
                  <Link
                    href="/simulator"
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-[var(--accent)] hover:bg-white/[0.06]"
                  >
                    {t("simulator")}
                  </Link>
                </li>
              )}
              {BLOG_NAV_ENABLED && (
                <li>
                  <Link
                    href="/blog"
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-primary hover:bg-white/[0.06]"
                  >
                    {t("blog")}
                  </Link>
                </li>
              )}
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

      {mounted &&
        hoverCat &&
        (categoryBrandsMap[hoverCat.slug]?.length ?? 0) > 0 &&
        createPortal(
          <div
            onMouseEnter={cancelCloseCategoryMenu}
            onMouseLeave={scheduleCloseCategoryMenu}
            className="fixed z-50 min-w-[220px] overflow-hidden rounded-xl border py-2 shadow-xl"
            style={{
              top: hoverCat.rect.bottom + 4,
              left: hoverCat.rect.left,
              background: "var(--surface)",
              borderColor: "var(--border)",
            }}
          >
            {categoryBrandsMap[hoverCat.slug].map((b) => (
              <Link
                key={b.id}
                href={`/catalog/${hoverCat.slug}?brand=${b.slug}`}
                onClick={() => setHoverCat(null)}
                className="block whitespace-nowrap px-4 py-2 text-sm text-secondary transition hover:bg-white/[0.06] hover:text-primary"
              >
                {b.name}
              </Link>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
