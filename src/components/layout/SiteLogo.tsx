import { cn } from "@/lib/utils";

type Props = {
  /** id for intro fly target */
  slotId?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showWordmark?: boolean;
};

/** Mark height ~36–44px for header; crisp SVG on retina */
const MARK: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-9 w-9", // 36px
  md: "h-10 w-10 sm:h-11 sm:w-11", // 40–44px
  lg: "h-12 w-12", // 48px
};

const WORD: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-base",
  md: "text-lg sm:text-xl",
  lg: "text-xl",
};

/**
 * Clean Pro-Optics mark + wordmark (SVG, no pale/broken raster icon).
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
          "ring-1 ring-white/15 shadow-[0_2px_12px_rgba(0,0,0,0.35)]",
          MARK[size]
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/pro-optics-mark.svg"
          alt="Pro-Optics"
          width={44}
          height={44}
          className="h-full w-full object-cover"
          decoding="async"
        />
      </span>
      {showWordmark ? (
        <span
          className={cn(
            "font-display font-semibold tracking-tight text-primary",
            WORD[size]
          )}
        >
          Pro<span className="text-[var(--accent)]">-Optics</span>
        </span>
      ) : null}
    </span>
  );
}
