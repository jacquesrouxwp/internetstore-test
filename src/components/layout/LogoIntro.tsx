"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

const STORAGE_KEY = "pro_optics_logo_intro_v1";
const HOLD_MS = 2000;
const FLY_MS = 0.95; // seconds for framer

type Phase = "hold" | "fly" | "done";

/**
 * Logo appears large in the center (~2s), then flies into the header logo slot.
 * Once per browser session (sessionStorage).
 */
export function LogoIntro() {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState<Phase | "idle">("idle");
  const [target, setTarget] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (reduceMotion) {
      setPhase("done");
      return;
    }

    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") {
        setPhase("done");
        return;
      }
    } catch {
      /* private mode */
    }

    setPhase("hold");
    document.documentElement.classList.add("logo-intro-active");

    const t = window.setTimeout(() => {
      const el = document.getElementById("site-logo-slot");
      if (el) {
        const r = el.getBoundingClientRect();
        setTarget({
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          w: r.width,
          h: r.height,
        });
      } else {
        // fallback: top-left header-ish
        setTarget({ x: 56, y: 72, w: 40, h: 40 });
      }
      setPhase("fly");
    }, HOLD_MS);

    return () => {
      window.clearTimeout(t);
      document.documentElement.classList.remove("logo-intro-active");
    };
  }, [reduceMotion]);

  const finish = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    document.documentElement.classList.remove("logo-intro-active");
    setPhase("done");
  };

  // Notify header when intro finished (CSS class on html)
  useEffect(() => {
    if (phase === "done") {
      document.documentElement.classList.add("logo-intro-done");
    } else {
      document.documentElement.classList.remove("logo-intro-done");
    }
  }, [phase]);

  if (phase === "idle" || phase === "done") return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const startSize = Math.min(280, vw * 0.55, vh * 0.4);

  const endW = target?.w ?? 40;
  const endH = target?.h ?? 40;
  const endX = target ? target.x - endW / 2 : 36;
  const endY = target ? target.y - endH / 2 : 52;

  const centerX = vw / 2 - startSize / 2;
  const centerY = vh / 2 - startSize / 2;
  const isHold = phase === "hold";

  return (
    <>
      {/* Dim backdrop during hold + fly */}
      <motion.div
        key="logo-backdrop"
        className="pointer-events-none fixed inset-0 z-[100]"
        initial={{ opacity: 0 }}
        animate={{
          opacity: isHold ? 0.72 : 0,
        }}
        transition={{ duration: isHold ? 0.45 : FLY_MS * 0.85 }}
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(8,10,16,0.35) 0%, rgba(5,6,15,0.88) 70%)",
        }}
        aria-hidden
      />

      <motion.div
        key="logo-fly"
        className="pointer-events-none fixed z-[101] overflow-hidden rounded-[22%] shadow-[0_20px_60px_rgba(0,0,0,0.55)] ring-1 ring-white/20"
        style={{ position: "fixed" }}
        initial={{
          left: centerX,
          top: centerY,
          width: startSize,
          height: startSize,
          opacity: 0,
          scale: 0.82,
        }}
        animate={
          isHold
            ? {
                left: centerX,
                top: centerY,
                width: startSize,
                height: startSize,
                opacity: 1,
                scale: 1,
              }
            : {
                left: endX,
                top: endY,
                width: endW,
                height: endH,
                opacity: 1,
                scale: 1,
              }
        }
        transition={
          isHold
            ? {
                opacity: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
                scale: {
                  duration: 0.7,
                  ease: [0.22, 1, 0.36, 1],
                },
              }
            : {
                left: {
                  duration: FLY_MS,
                  ease: [0.65, 0.05, 0.18, 1],
                },
                top: {
                  duration: FLY_MS,
                  ease: [0.45, 0.05, 0.12, 1],
                },
                width: {
                  duration: FLY_MS,
                  ease: [0.55, 0.05, 0.2, 1],
                },
                height: {
                  duration: FLY_MS,
                  ease: [0.55, 0.05, 0.2, 1],
                },
              }
        }
        onAnimationComplete={() => {
          if (!isHold) finish();
        }}
        aria-hidden
      >
        <Image
          src="/logos/pro-optics.webp"
          alt="Pro-Optics"
          fill
          priority
          sizes="(max-width: 768px) 55vw, 280px"
          className="object-cover"
        />
      </motion.div>
    </>
  );
}
