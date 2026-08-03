"use client";

/**
 * Infinite marquee slider (horizontal / vertical).
 * Kaif UI style — framer-motion + react-use-measure.
 * @see https://kaif-ui.vercel.app/
 */

import { cn } from "@/lib/utils";
import { useMotionValue, animate, motion } from "framer-motion";
import { useState, useEffect, type ReactNode } from "react";
import useMeasure from "react-use-measure";

type InfiniteSliderProps = {
  children: ReactNode;
  gap?: number;
  duration?: number;
  durationOnHover?: number;
  direction?: "horizontal" | "vertical";
  reverse?: boolean;
  className?: string;
};

export function InfiniteSlider({
  children,
  gap = 16,
  duration = 25,
  durationOnHover,
  direction = "horizontal",
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const [currentDuration, setCurrentDuration] = useState(duration);
  const [ref, { width, height }] = useMeasure();
  const translation = useMotionValue(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [key, setKey] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Keep in sync if parent changes duration prop
  useEffect(() => {
    setCurrentDuration(duration);
  }, [duration]);

  // Accessibility: pause infinite motion when user prefers reduced motion
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      translation.set(0);
      return;
    }
    let controls: { stop: () => void } | undefined;
    const size = direction === "horizontal" ? width : height;
    const contentSize = size + gap;
    // Wait until layout is measured
    if (!size || !Number.isFinite(contentSize) || contentSize <= 0) return;

    const from = reverse ? -contentSize / 2 : 0;
    const to = reverse ? 0 : -contentSize / 2;

    if (isTransitioning) {
      const remaining =
        contentSize > 0
          ? Math.abs((translation.get() - to) / contentSize)
          : 1;
      controls = animate(translation, [translation.get(), to], {
        ease: "linear",
        duration: currentDuration * remaining,
        onComplete: () => {
          setIsTransitioning(false);
          setKey((prevKey) => prevKey + 1);
        },
      });
    } else {
      controls = animate(translation, [from, to], {
        ease: "linear",
        duration: currentDuration,
        repeat: Infinity,
        repeatType: "loop",
        repeatDelay: 0,
        onRepeat: () => {
          translation.set(from);
        },
      });
    }

    return () => controls?.stop();
  }, [
    key,
    translation,
    currentDuration,
    width,
    height,
    gap,
    isTransitioning,
    direction,
    reverse,
    reduceMotion,
  ]);

  const hoverProps =
    durationOnHover && !reduceMotion
      ? {
          onHoverStart: () => {
            setIsTransitioning(true);
            setCurrentDuration(durationOnHover);
          },
          onHoverEnd: () => {
            setIsTransitioning(true);
            setCurrentDuration(duration);
          },
        }
      : {};

  return (
    <div className={cn("overflow-hidden", className)}>
      <motion.div
        className="flex w-max"
        style={{
          ...(direction === "horizontal"
            ? { x: reduceMotion ? 0 : translation }
            : { y: reduceMotion ? 0 : translation }),
          gap: `${gap}px`,
          flexDirection: direction === "horizontal" ? "row" : "column",
          // Allow taps/clicks on brand cards inside the marquee
          pointerEvents: "auto",
        }}
        ref={ref}
        {...hoverProps}
      >
        {children}
        {/* Duplicate track for seamless loop (static if reduced motion) */}
        {!reduceMotion && children}
      </motion.div>
    </div>
  );
}
