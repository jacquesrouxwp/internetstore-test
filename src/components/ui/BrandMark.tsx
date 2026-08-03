import type React from "react";
import { cn } from "@/lib/utils";

export type BrandMarkId = "nova-poshta" | "telegram" | "viber" | "whatsapp";

type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "h-8 w-8",
  md: "h-9 w-9",
  lg: "h-10 w-10",
};

const ICON_PX: Record<Size, number> = {
  sm: 18,
  md: 22,
  lg: 24,
};

/** Raster logos from public/logos (cutouts without junk background) */
const LOGO_SRC: Partial<Record<BrandMarkId, string>> = {
  telegram: "/logos/telegram.png",
  whatsapp: "/logos/whatsapp.png",
  "nova-poshta": "/logos/nova-poshta.jpg",
};

const LABELS: Record<BrandMarkId, string> = {
  "nova-poshta": "Нова Пошта",
  telegram: "Telegram",
  viber: "Viber",
  whatsapp: "WhatsApp",
};

/** Fallback mono icons if raster missing */
function TelegramIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function WhatsAppIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function NovaPoshtaIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.2l6.5 3.6v7.4L12 18.8l-6.5-3.6V7.8L12 4.2zM8.5 9.5v5l3.5 2 3.5-2v-5L12 7.5 8.5 9.5z" />
    </svg>
  );
}

function ViberIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.282 4.232.248 6.879.04 10.184c-.244 3.88.148 8.983 3.228 11.325 1.195.91 3.072 1.51 5.06 1.69 1.027.092 1.948.06 3.74-.176 1.533-.2 3.497-.816 4.875-1.535.63-.328 1.83-.95 1.97-1.348.12-.343-.21-.546-.438-.735-.31-.256-.656-.43-.98-.64-.423-.273-.812-.552-1.234-.82-.25-.158-.57-.13-.78.096-.37.4-.79.78-1.13 1.21-.16.2-.37.37-.63.38-.43.02-.98-.17-1.78-.53-1.47-.66-2.59-1.72-3.55-3.01-.4-.54-.77-1.22-1.04-1.89-.15-.38-.02-.75.34-.95.34-.19.72-.44 1.07-.66.32-.2.51-.53.46-.9-.09-.64-.28-1.65-.43-2.31-.1-.43-.34-.69-.75-.78-.41-.09-.94-.15-1.39-.15-.73 0-1.24.24-1.54.58-.45.5-.69 1.22-.69 2.07 0 .36.03.74.12 1.14.53 2.43 1.75 4.69 3.63 6.52 1.94 1.88 4.49 3.31 7.28 3.75 1.14.18 2.25.14 3.2-.2.8-.28 1.45-.8 1.82-1.53.35-.69.45-1.5.3-2.37-.12-.72-.48-1.37-1.02-1.85-.43-.38-1.02-.53-1.64-.45-.35.04-.7.14-1.02.31-.2.1-.38.12-.55.01-.17-.11-.28-.32-.32-.55-.12-.72-.27-1.44-.4-2.16-.07-.38.05-.72.34-.94.29-.22.68-.28 1.05-.17.9.27 1.75.7 2.48 1.25 1.38 1.04 2.17 2.52 2.34 4.23.16 1.62-.23 3.17-1.15 4.5-.98 1.42-2.5 2.35-4.3 2.66-1.22.21-2.48.2-3.74-.03-2.33-.42-4.47-1.43-6.24-2.97C3.59 17.45 2.1 14.95 1.55 12.1c-.4-2.06-.28-4.18.36-6.13.7-2.14 1.96-3.97 3.7-5.22C7.5-.05 9.7-.2 11.4.002z" />
    </svg>
  );
}

const FALLBACK: Record<
  BrandMarkId,
  (p: { size: number }) => React.ReactElement
> = {
  telegram: TelegramIcon,
  viber: ViberIcon,
  whatsapp: WhatsAppIcon,
  "nova-poshta": NovaPoshtaIcon,
};

const FALLBACK_COLOR: Record<BrandMarkId, string> = {
  "nova-poshta": "var(--brand-nova-poshta, #e21a23)",
  telegram: "var(--brand-telegram)",
  viber: "var(--brand-viber)",
  whatsapp: "var(--brand-whatsapp)",
};

type Props = {
  brand: BrandMarkId;
  size?: Size;
  className?: string;
  withLabel?: boolean;
  labelClassName?: string;
};

/**
 * Brand marks: real logos for Telegram / WhatsApp when available.
 */
export function BrandMark({
  brand,
  size = "md",
  className,
  withLabel,
  labelClassName,
}: Props) {
  const px = ICON_PX[size];
  const logo = LOGO_SRC[brand];
  const Icon = FALLBACK[brand];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
          SIZES[size]
        )}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            width={px + 8}
            height={px + 8}
            className="h-full w-full object-contain"
            draggable={false}
          />
        ) : (
          <span style={{ color: FALLBACK_COLOR[brand] }}>
            <Icon size={px} />
          </span>
        )}
      </span>
      {withLabel ? (
        <span
          className={cn("text-sm font-semibold text-primary", labelClassName)}
        >
          {LABELS[brand]}
        </span>
      ) : null}
    </span>
  );
}
