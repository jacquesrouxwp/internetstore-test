"use client";

import { useEffect, useState } from "react";
import { ReticleToggle } from "@/components/ui/reticle-toggle";

const STORAGE_KEY = "optics_light_mode";

/**
 * Site-wide ambient light toggle (reticle / scope icon).
 * Syncs with ParticleHero mid-spot via localStorage + optics-light event.
 */
export function LightSwitch({ className }: { className?: string }) {
  const [on, setOn] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY) === "1";
      setOn(saved);
      document.documentElement.dataset.light = saved ? "on" : "off";
    } catch {
      /* ignore */
    }

    const onGlobal = (e: Event) => {
      const detail = (e as CustomEvent<{ on: boolean }>).detail;
      if (detail && typeof detail.on === "boolean") setOn(detail.on);
    };
    window.addEventListener("optics-light", onGlobal);
    return () => window.removeEventListener("optics-light", onGlobal);
  }, []);

  const toggle = () => {
    setOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      document.documentElement.dataset.light = next ? "on" : "off";
      window.dispatchEvent(
        new CustomEvent("optics-light", { detail: { on: next } })
      );
      return next;
    });
  };

  if (!mounted) return null;

  return (
    <ReticleToggle
      active={on}
      onToggle={toggle}
      variant="header"
      className={className}
    />
  );
}
