"use client";

import { Lightbulb, LightbulbOff } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "optics_light_mode";

/**
 * Site-wide ambient light toggle.
 * Applies `data-light="on"` on <html> for global CSS accents.
 * Hero ParticleHero has its own local switch; this one is optional in header.
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
      // Notify ParticleHero if listening
      window.dispatchEvent(
        new CustomEvent("optics-light", { detail: { on: next } })
      );
      return next;
    });
  };

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-semibold transition",
        on
          ? "border-amber-400/40 bg-amber-400/15 text-amber-700"
          : "border-line bg-white text-muted hover:text-ink",
        className
      )}
      aria-pressed={on}
      title={on ? "Вимкнути світло" : "Увімкнути світло"}
      aria-label={on ? "Turn light off" : "Turn light on"}
    >
      {on ? (
        <Lightbulb className="h-4 w-4 fill-amber-400 text-amber-500" />
      ) : (
        <LightbulbOff className="h-4 w-4" />
      )}
      <span className="hidden lg:inline">{on ? "Light" : "Dark"}</span>
    </button>
  );
}
