"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";
import {
  trackConsultClick,
  type ConsultChannel,
  type ConsultSource,
} from "@/lib/analytics/consult";

const WIDTH = 264;
const GAP = 8;

const TEXT = {
  uk: { call: "Подзвонити", tg: "Написати в Telegram", wa: "Написати у WhatsApp", hi: "Доброго дня" },
  ru: { call: "Позвонить", tg: "Написать в Telegram", wa: "Написать в WhatsApp", hi: "Добрый день" },
  en: { call: "Call", tg: "Message on Telegram", wa: "Message on WhatsApp", hi: "Hello" },
} as const;

type Open = {
  digits: string;
  label: string;
  source: ConsultSource;
  left: number;
  top?: number;
  bottom?: number;
  scrollY: number;
  keyboard: boolean;
};

function sourceOf(a: Element): ConsultSource {
  const tagged = a.closest("[data-consult-source]")?.getAttribute("data-consult-source");
  if (tagged) return tagged as ConsultSource;
  if (a.closest("header")) return "header";
  if (a.closest("footer")) return "footer";
  return "other";
}

/**
 * Every phone number on the site (tel: links, including the ones made from
 * plain text in articles and descriptions) opens a small menu instead of
 * dialling right away: call, Telegram or WhatsApp. Links marked
 * data-phone-direct dial as before.
 */
export function PhoneChooser() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = TEXT[locale as keyof typeof TEXT] ?? TEXT.uk;
  const [open, setOpen] = useState<Open | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const a = target?.closest?.('a[href^="tel:"]');
      if (!a || a.hasAttribute("data-phone-direct")) return;
      // Capture phase on window: runs before React, so the link's own
      // "phone" tracking does not count a contact that has not happened yet.
      e.preventDefault();
      e.stopPropagation();

      const digits = (a.getAttribute("href") ?? "").replace(/\D/g, "");
      if (!digits) return;
      const r = a.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const left = Math.min(
        Math.max(r.left + r.width / 2 - WIDTH / 2, GAP),
        Math.max(vw - WIDTH - GAP, GAP)
      );
      const below = vh - r.bottom > 200 || r.top < 200;
      const source = sourceOf(a);
      setOpen({
        digits,
        label: a.textContent?.trim() || `+${digits}`,
        source,
        left,
        top: below ? r.bottom + GAP : undefined,
        bottom: below ? undefined : vh - r.top + GAP,
        scrollY: window.scrollY,
        keyboard: e.detail === 0,
      });
      trackConsultClick("open_sheet", source);
    };
    window.addEventListener("click", onClick, true);
    return () => window.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    setOpen(null);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    if (open.keyboard) {
      boxRef.current?.querySelector<HTMLElement>("a")?.focus({ preventScroll: true });
    }
    const close = () => setOpen(null);
    const onPointer = (e: PointerEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onScroll = () => {
      if (Math.abs(window.scrollY - open.scrollY) > 40) close();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  if (!open) return null;

  const pick = (channel: ConsultChannel) => {
    trackConsultClick(channel, open.source);
    // after the click, so the link still navigates
    setTimeout(() => setOpen(null), 0);
  };

  const item =
    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary transition hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none";

  return (
    <div
      ref={boxRef}
      role="menu"
      aria-label={open.label}
      className="fixed z-[60] overflow-hidden rounded-2xl p-1.5"
      style={{
        left: open.left,
        top: open.top,
        bottom: open.bottom,
        width: WIDTH,
        // solid: the page text must not show through the menu
        background: "#16181d",
        border: "1px solid var(--border, rgba(255,255,255,0.08))",
        boxShadow: "0 12px 36px rgba(0,0,0,0.6)",
      }}
    >
      <p className="px-3 pb-1 pt-1.5 text-xs font-semibold text-secondary">{open.label}</p>
      <a
        role="menuitem"
        href={`tel:+${open.digits}`}
        data-phone-direct
        onClick={() => pick("phone")}
        className={item}
      >
        <span
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: "rgba(34,197,94,0.14)", color: "#22c55e" }}
        >
          <Phone className="h-4 w-4" />
        </span>
        {t.call}
      </a>
      <a
        role="menuitem"
        href={`https://t.me/+${open.digits}`}
        target="_blank"
        rel="noreferrer"
        onClick={() => pick("telegram")}
        className={item}
      >
        <BrandMark brand="telegram" size="md" />
        {t.tg}
      </a>
      <a
        role="menuitem"
        href={`https://wa.me/${open.digits}?text=${encodeURIComponent(t.hi)}`}
        target="_blank"
        rel="noreferrer"
        onClick={() => pick("whatsapp")}
        className={item}
      >
        <BrandMark brand="whatsapp" size="md" />
        {t.wa}
      </a>
    </div>
  );
}
