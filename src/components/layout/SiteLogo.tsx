import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  /** id for intro fly target */
  slotId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showWordmark?: boolean;
};

const SIZES = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-11 w-11",
} as const;

/**
 * Site logo mark — soft rounded square (not hard corners).
 */
export function SiteLogo({
  slotId,
  size = "md",
  className,
  showWordmark = true,
}: Props) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        id={slotId}
        className={cn(
          "relative shrink-0 overflow-hidden rounded-[22%]",
          "shadow-[0_2px_12px_rgba(0,0,0,0.35)] ring-1 ring-white/15",
          SIZES[size]
        )}
      >
        <Image
          src="/logos/pro-optics.webp"
          alt="Pro-Optics"
          fill
          sizes="44px"
          className="object-cover"
          priority={Boolean(slotId)}
        />
      </span>
      {showWordmark ? (
        <span className="font-display text-lg font-semibold tracking-tight text-primary">
          Pro<span className="text-[var(--accent)]">-Optics</span>
        </span>
      ) : null}
    </span>
  );
}
