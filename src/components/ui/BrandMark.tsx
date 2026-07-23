import Image from "next/image";
import { cn } from "@/lib/utils";

export type BrandMarkId = "nova-poshta" | "telegram" | "viber" | "whatsapp";

const ASSETS: Record<
  BrandMarkId,
  { src: string; alt: string; label: string }
> = {
  "nova-poshta": {
    src: "/logos/nova-poshta.jpg",
    alt: "Нова Пошта",
    label: "Нова Пошта",
  },
  telegram: {
    src: "/logos/telegram.jpg",
    alt: "Telegram",
    label: "Telegram",
  },
  viber: {
    src: "/logos/viber.png",
    alt: "Viber",
    label: "Viber",
  },
  whatsapp: {
    src: "/logos/whatsapp.jpg",
    alt: "WhatsApp",
    label: "WhatsApp",
  },
};

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-11 w-11",
};

type Props = {
  brand: BrandMarkId;
  size?: Size;
  className?: string;
  /** Show text label next to logo */
  withLabel?: boolean;
  labelClassName?: string;
};

/**
 * Partner / messenger logos — soft rounded (not square corners).
 */
export function BrandMark({
  brand,
  size = "md",
  className,
  withLabel,
  labelClassName,
}: Props) {
  const asset = ASSETS[brand];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "relative inline-flex shrink-0 overflow-hidden",
          "rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.35)]",
          "ring-1 ring-white/15",
          SIZES[size]
        )}
      >
        <Image
          src={asset.src}
          alt={asset.alt}
          fill
          sizes={size === "lg" ? "44px" : size === "md" ? "36px" : "28px"}
          className="object-cover"
        />
      </span>
      {withLabel ? (
        <span
          className={cn(
            "text-sm font-semibold text-primary",
            labelClassName
          )}
        >
          {asset.label}
        </span>
      ) : null}
    </span>
  );
}
