"use client";

import { useEffect } from "react";

/**
 * Premium body scroll lock for drawers / sheets.
 * Works on iOS Safari + Android / MIUI / Redmi where overflow:hidden alone
 * still lets the page scroll underneath a mobile menu.
 *
 * Strategy:
 * 1) freeze body with position:fixed at current scrollY
 * 2) block touchmove on the document except inside [data-scroll-lock-scroll]
 * 3) restore scroll position on unlock
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY || html.scrollTop || 0;

    const prev = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyLeft: body.style.left,
      bodyRight: body.style.right,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.setAttribute("data-scroll-lock", "true");

    const allow = (target: EventTarget | null) => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest("[data-scroll-lock-scroll]") ||
          target.closest("[data-scroll-lock-allow]")
      );
    };

    const onTouchMove = (e: TouchEvent) => {
      if (allow(e.target)) return;
      e.preventDefault();
    };

    // non-passive so preventDefault actually works on Android
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.removeEventListener("touchmove", onTouchMove);

      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.left = prev.bodyLeft;
      body.style.right = prev.bodyRight;
      body.style.width = prev.bodyWidth;
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.removeAttribute("data-scroll-lock");

      window.scrollTo(0, scrollY);
    };
  }, [locked]);
}
