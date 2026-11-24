"use client";

import { useEffect, useRef } from "react";

/**
 * Light snowfall over the site for the winter holidays. A single canvas that
 * never takes clicks; it stays off outside the season, for people who ask
 * their system for less motion, and while the tab is hidden.
 */

/** Inclusive season, Kyiv dates as MM-DD: from late November to Old New Year. */
const SEASON_FROM = "11-24";
const SEASON_TO = "01-14";

export function inSnowSeason(now: Date): boolean {
  const md = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Kyiv", month: "2-digit", day: "2-digit" })
    .format(now)
    .replace("/", "-");
  return md >= SEASON_FROM || md <= SEASON_TO;
}

type Flake = { x: number; y: number; r: number; vy: number; drift: number; phase: number; alpha: number };

export function Snowfall() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!inSnowSeason(new Date())) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let w = 0;
    let h = 0;
    let flakes: Flake[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const make = (anywhere: boolean): Flake => {
      const r = 0.8 + Math.random() * 2.2;
      return {
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : -5,
        r,
        vy: 0.25 + r * 0.22,
        drift: 0.3 + Math.random() * 0.6,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.35 + Math.random() * 0.45,
      };
    };

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Sparse on phones, a little more on wide screens
      const count = Math.round(Math.min(110, Math.max(35, (w * h) / 16000)));
      flakes = Array.from({ length: count }, () => make(true));
    };

    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      const dt = Math.min(50, t - last) / 16.7;
      last = t;
      ctx.clearRect(0, 0, w, h);
      for (const f of flakes) {
        f.phase += 0.01 * dt;
        f.y += f.vy * dt;
        f.x += Math.sin(f.phase) * f.drift * 0.5 * dt;
        if (f.y > h + 5 || f.x < -10 || f.x > w + 10) Object.assign(f, make(false));
        ctx.globalAlpha = f.alpha;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : start());

    const onResize = () => {
      resize();
      ctx.fillStyle = "#ffffff";
    };
    onResize();
    start();
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[60] h-full w-full"
    />
  );
}
