"use client";

import { cn } from "@/lib/utils";

/**
 * Optics reticle (scope crosshair) used as light / gold-mode toggle.
 * Compact for header; larger for ParticleHero mid-spot.
 */
export function ReticleIcon({
  active = false,
  className,
  size = 28,
}: {
  active?: boolean;
  className?: string;
  size?: number;
}) {
  const stroke = active ? "#d8bd10" : "currentColor";
  const glow = active ? "#d8bd10" : "#98c0ef";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      {/* Outer scope ring */}
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke={stroke}
        strokeWidth="1.5"
        opacity="0.9"
      />
      {/* Inner mil-dot ring */}
      <circle
        cx="24"
        cy="24"
        r="12"
        stroke={stroke}
        strokeWidth="1"
        opacity="0.55"
      />
      {/* Center open circle (donut reticle) */}
      <circle
        cx="24"
        cy="24"
        r="2.2"
        stroke={stroke}
        strokeWidth="1.4"
        fill={active ? glow : "none"}
        fillOpacity={active ? 0.35 : 0}
      />
      {/* Crosshair lines with gap at center */}
      <line x1="24" y1="3" x2="24" y2="14" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="24" y1="34" x2="24" y2="45" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="3" y1="24" x2="14" y2="24" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      <line x1="34" y1="24" x2="45" y2="24" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
      {/* Tick marks (mildot style) */}
      <line x1="22" y1="8" x2="26" y2="8" stroke={stroke} strokeWidth="1" opacity="0.7" />
      <line x1="22" y1="40" x2="26" y2="40" stroke={stroke} strokeWidth="1" opacity="0.7" />
      <line x1="8" y1="22" x2="8" y2="26" stroke={stroke} strokeWidth="1" opacity="0.7" />
      <line x1="40" y1="22" x2="40" y2="26" stroke={stroke} strokeWidth="1" opacity="0.7" />
      {/* Corner brackets — tactical scope feel */}
      <path d="M10 14 V10 H14" stroke={stroke} strokeWidth="1.2" opacity="0.5" />
      <path d="M38 14 V10 H34" stroke={stroke} strokeWidth="1.2" opacity="0.5" />
      <path d="M10 34 V38 H14" stroke={stroke} strokeWidth="1.2" opacity="0.5" />
      <path d="M38 34 V38 H34" stroke={stroke} strokeWidth="1.2" opacity="0.5" />
    </svg>
  );
}

type ReticleToggleProps = {
  active: boolean;
  onToggle: () => void;
  className?: string;
  /** hero = large mid-spot on ParticleHero; header = compact */
  variant?: "hero" | "header";
  titleOn?: string;
  titleOff?: string;
};

export function ReticleToggle({
  active,
  onToggle,
  className,
  variant = "header",
  titleOn = "Вимкнути світло",
  titleOff = "Увімкнути світло",
}: ReticleToggleProps) {
  const isHero = variant === "hero";

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={active ? "Turn light off" : "Turn light on"}
      title={active ? titleOn : titleOff}
      className={cn(
        "group relative inline-flex items-center justify-center rounded-full transition-all duration-500",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        isHero
          ? cn(
              "h-[2.4em] w-[2.4em] cursor-pointer",
              "bg-black/80 backdrop-blur-sm",
              active
                ? "shadow-[0_0_1.2em_0_#d8bd10] text-[#d8bd10] focus-visible:ring-amber-400/50"
                : "shadow-[0_0_1em_0_#98c0ef] text-[#98c0ef] focus-visible:ring-sky-300/40",
              "hover:scale-110 active:scale-95"
            )
          : cn(
              "h-9 w-9 border",
              active
                ? "border-amber-400/50 bg-amber-400/10 text-amber-600 shadow-[0_0_12px_rgba(216,189,16,0.35)]"
                : "border-line bg-white text-muted hover:border-ink/25 hover:text-ink",
              "focus-visible:ring-accent/30"
            ),
        className
      )}
    >
      {/* Soft glow ring behind reticle */}
      <span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full transition-opacity duration-500",
          active
            ? "bg-[radial-gradient(circle,rgba(216,189,16,0.25)_0%,transparent_70%)] opacity-100"
            : "bg-[radial-gradient(circle,rgba(152,192,239,0.2)_0%,transparent_70%)] opacity-80 group-hover:opacity-100"
        )}
      />
      <ReticleIcon
        active={active}
        size={isHero ? 30 : 20}
        className={cn(
          "relative z-[1] transition-transform duration-500",
          active && "rotate-45",
          "group-hover:scale-105"
        )}
      />
      {/* Tiny status dot */}
      <span
        className={cn(
          "absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full transition-colors",
          isHero && "h-2 w-2",
          active ? "bg-amber-400 shadow-[0_0_6px_#d8bd10]" : "bg-sky-400/80"
        )}
      />
    </button>
  );
}
