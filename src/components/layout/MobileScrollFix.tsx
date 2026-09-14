"use client";

import { useEffect } from "react";

/**
 * Safety net for Android / MIUI / Redmi browsers:
 * - clears a stuck body overflow:hidden left by a sheet/drawer
 * - strips any inline touch-action that can freeze vertical scroll
 * Runs once on mount and on bfcache restore (back/forward).
 */
export function MobileScrollFix() {
  useEffect(() => {
    const unlock = () => {
      const html = document.documentElement;
      const body = document.body;

      // Only clear if no known open modal/drawer markers are present
      const modalOpen =
        document.querySelector('[aria-modal="true"]') ||
        document.querySelector('[data-scroll-lock="true"]');

      // Never fight an intentional lock (burger / drawer / sheet)
      if (modalOpen) return;

      if (body.style.overflow === "hidden") body.style.overflow = "";
      if (html.style.overflow === "hidden") html.style.overflow = "";
      body.style.removeProperty("touch-action");
      html.style.removeProperty("touch-action");
      body.style.removeProperty("position");
      body.style.removeProperty("top");
      body.style.removeProperty("left");
      body.style.removeProperty("right");
      body.style.removeProperty("width");
      if (html.style.overflowY === "hidden") html.style.overflowY = "";
      if (body.style.overflowY === "hidden") body.style.overflowY = "";
    };

    unlock();
    window.addEventListener("pageshow", unlock);
    return () => window.removeEventListener("pageshow", unlock);
  }, []);

  return null;
}
